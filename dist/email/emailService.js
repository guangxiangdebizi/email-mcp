import { google } from "googleapis";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { validateEmailConfig, } from "../config.js";
import { buildImapSearchQuery } from "./imapQuery.js";
import { decodeMessageLocator, encodeGmailMessageLocator, encodeImapMessageLocator, } from "./messageLocator.js";
const MAX_BODY_LENGTH = 4_000;
const MAX_SOURCE_BYTES = 512 * 1024;
function accountLabel(config) {
    return config.account ?? config.defaultFrom ?? config.smtp?.user ?? config.imap?.user ?? "default";
}
function collapseWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
}
function stripHtml(value) {
    return collapseWhitespace(value
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'"));
}
function parsedBody(mail) {
    const value = mail.text?.trim() || (mail.html ? stripHtml(mail.html) : "");
    return value.slice(0, MAX_BODY_LENGTH);
}
function formatImapAddresses(addresses) {
    return (addresses ?? [])
        .map(({ name, address }) => (name && address ? `${name} <${address}>` : address ?? name ?? ""))
        .filter(Boolean)
        .join(", ");
}
function parsedAddressText(value) {
    if (!value)
        return "";
    return (Array.isArray(value) ? value : [value]).map((entry) => entry.text).join(", ");
}
function parsedAddressValues(value) {
    if (!value)
        return [];
    return (Array.isArray(value) ? value : [value]).flatMap((entry) => entry.value.flatMap((address) => {
        if (address.address)
            return [address.address];
        return (address.group ?? []).flatMap((group) => (group.address ? [group.address] : []));
    }));
}
function uniqueAddresses(addresses, excluded = []) {
    const excludedSet = new Set(excluded.map((value) => value.toLowerCase()));
    const seen = new Set();
    return addresses.filter((address) => {
        const key = address.trim().toLowerCase();
        if (!key || excludedSet.has(key) || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function gmailHeader(headers, name) {
    return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}
function gmailFolderQuery(folder) {
    const normalized = folder.trim();
    if (!normalized)
        return "";
    return `in:${/^[\w-]+$/.test(normalized) ? normalized : `"${normalized.replace(/"/g, '\\"')}"`}`;
}
async function mapWithConcurrency(values, concurrency, mapper) {
    const results = new Array(values.length);
    let nextIndex = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
        while (nextIndex < values.length) {
            const index = nextIndex++;
            results[index] = await mapper(values[index]);
        }
    }));
    return results;
}
function smtpAttachments(attachments) {
    return attachments?.map((attachment) => ({
        filename: attachment.filename,
        ...(attachment.path ? { path: attachment.path } : {}),
        ...(attachment.content !== undefined ? { content: attachment.content } : {}),
    }));
}
async function buildRawMime(options) {
    const composer = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: "unix",
    });
    const result = await composer.sendMail(options);
    const message = result.message;
    if (!Buffer.isBuffer(message))
        throw new Error("Failed to build MIME message");
    return message;
}
function encodeGmailRaw(value) {
    return value.toString("base64url");
}
function decodeGmailRaw(value) {
    return Buffer.from(value, "base64url");
}
export class EmailService {
    config;
    constructor(config) {
        this.config = config;
    }
    gmailClient() {
        const credentials = this.config.gmail ?? {};
        const oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
        oauth2Client.setCredentials({
            refresh_token: credentials.refreshToken,
            access_token: credentials.accessToken,
        });
        return google.gmail({ version: "v1", auth: oauth2Client });
    }
    imapClient() {
        const config = this.config.imap;
        return new ImapFlow({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                ...(config.accessToken ? { accessToken: config.accessToken } : { pass: config.pass }),
            },
            tls: { rejectUnauthorized: config.tlsRejectUnauthorized },
            logger: false,
            connectionTimeout: 30_000,
            greetingTimeout: 15_000,
            socketTimeout: 60_000,
        });
    }
    smtpTransport() {
        const config = this.config.smtp;
        const auth = config.accessToken
            ? { type: "OAuth2", user: config.user, accessToken: config.accessToken }
            : { user: config.user, pass: config.pass };
        return nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth,
            tls: { rejectUnauthorized: config.tlsRejectUnauthorized },
            connectionTimeout: 30_000,
            greetingTimeout: 15_000,
            socketTimeout: 60_000,
        });
    }
    async withImap(callback) {
        const client = this.imapClient();
        client.on("error", () => undefined);
        await client.connect();
        try {
            return await callback(client);
        }
        finally {
            if (client.usable)
                await client.logout().catch(() => client.close());
            else
                client.close();
        }
    }
    async send(input) {
        validateEmailConfig(this.config, "send");
        const from = input.from ?? this.config.defaultFrom;
        const mail = {
            from,
            to: input.to,
            subject: input.subject,
            ...(input.html ? { html: input.body } : { text: input.body }),
            attachments: smtpAttachments(input.attachments),
        };
        if (this.config.provider === "gmail-api") {
            const raw = await buildRawMime(mail);
            const response = await this.gmailClient().users.messages.send({
                userId: "me",
                requestBody: { raw: encodeGmailRaw(raw) },
            });
            return {
                ok: true,
                account: accountLabel(this.config),
                provider: this.config.provider,
                messageId: response.data.id ?? "",
                to: input.to,
                subject: input.subject,
            };
        }
        const response = await this.smtpTransport().sendMail(mail);
        return {
            ok: true,
            account: accountLabel(this.config),
            provider: this.config.provider,
            messageId: response.messageId,
            to: input.to,
            subject: input.subject,
        };
    }
    async read(input) {
        validateEmailConfig(this.config, "read");
        if (this.config.provider === "gmail-api") {
            const clauses = [gmailFolderQuery(input.folder), input.unreadOnly ? "is:unread" : ""].filter(Boolean);
            return this.readGmail(clauses.join(" "), input.limit);
        }
        return this.readImap(input.folder, input.unreadOnly ? { seen: false } : { all: true }, input.limit);
    }
    async search(input) {
        validateEmailConfig(this.config, "search");
        if (this.config.provider === "gmail-api") {
            const query = [input.query, gmailFolderQuery(input.folder)].filter(Boolean).join(" ");
            return this.readGmail(query, input.limit);
        }
        return this.readImap(input.folder, buildImapSearchQuery(input.query), input.limit);
    }
    async delete(messageId) {
        validateEmailConfig(this.config, "delete");
        const expectedProvider = this.config.provider === "gmail-api" ? "gmail" : "imap";
        const locator = decodeMessageLocator(messageId, expectedProvider);
        if (locator.provider !== expectedProvider) {
            throw new Error(`Message ID belongs to ${locator.provider}, but selected account uses ${expectedProvider}`);
        }
        if (locator.provider === "gmail") {
            await this.gmailClient().users.messages.delete({ userId: "me", id: locator.id });
        }
        else {
            await this.withImap(async (client) => {
                await client.mailboxOpen(locator.folder);
                const deleted = await client.messageDelete(locator.uid, { uid: true });
                if (!deleted)
                    throw new Error("Message was not found or could not be deleted");
            });
        }
        return {
            ok: true,
            account: accountLabel(this.config),
            provider: this.config.provider,
            messageId,
            deleted: true,
        };
    }
    async reply(input) {
        validateEmailConfig(this.config, "reply");
        const expectedProvider = this.config.provider === "gmail-api" ? "gmail" : "imap";
        const locator = decodeMessageLocator(input.messageId, expectedProvider);
        if (locator.provider !== expectedProvider) {
            throw new Error(`Message ID belongs to ${locator.provider}, but selected account uses ${expectedProvider}`);
        }
        if (locator.provider === "gmail")
            return this.replyGmail(locator.id, input);
        return this.replyImap(locator.folder, locator.uid, input);
    }
    async readImap(folder, query, limit) {
        return this.withImap(async (client) => {
            await client.mailboxOpen(folder);
            const matches = await client.search(query, { uid: true });
            if (!matches || matches.length === 0)
                return [];
            const selected = matches.slice(-limit);
            const messages = await client.fetchAll(selected, {
                uid: true,
                flags: true,
                envelope: true,
                internalDate: true,
                threadId: true,
                source: { maxLength: MAX_SOURCE_BYTES },
            }, { uid: true });
            const summaries = await Promise.all(messages.map((message) => this.imapSummary(message, folder)));
            return summaries.sort((left, right) => right.uid - left.uid).map(({ uid: _uid, ...summary }) => summary);
        });
    }
    async imapSummary(message, folder) {
        let parsed;
        if (message.source)
            parsed = await simpleParser(message.source).catch(() => undefined);
        const body = parsed ? parsedBody(parsed) : "";
        const envelope = message.envelope;
        const from = parsedAddressText(parsed?.from) || formatImapAddresses(envelope?.from);
        const to = parsedAddressText(parsed?.to) || formatImapAddresses(envelope?.to);
        const subject = parsed?.subject ?? envelope?.subject ?? "";
        const date = parsed?.date ?? envelope?.date ?? message.internalDate;
        return {
            uid: message.uid,
            messageId: encodeImapMessageLocator(folder, message.uid, this.config.account),
            internetMessageId: parsed?.messageId ?? envelope?.messageId,
            threadId: message.threadId,
            from,
            to,
            subject,
            date: date ? new Date(date).toISOString() : "",
            isUnread: !message.flags?.has("\\Seen"),
            snippet: collapseWhitespace(body).slice(0, 240),
            body,
            hasAttachments: Boolean(parsed?.attachments.length),
        };
    }
    async readGmail(query, limit) {
        const gmail = this.gmailClient();
        const response = await gmail.users.messages.list({
            userId: "me",
            q: query || undefined,
            maxResults: limit,
        });
        const messages = (response.data.messages ?? []).filter((message) => Boolean(message.id));
        return mapWithConcurrency(messages, 5, async (message) => {
            const detail = await gmail.users.messages.get({ userId: "me", id: message.id, format: "raw" });
            const parsed = detail.data.raw ? await simpleParser(decodeGmailRaw(detail.data.raw)) : undefined;
            const body = parsed ? parsedBody(parsed) : "";
            return {
                messageId: encodeGmailMessageLocator(message.id, this.config.account),
                internetMessageId: parsed?.messageId,
                threadId: detail.data.threadId ?? undefined,
                from: parsedAddressText(parsed?.from) || gmailHeader(detail.data.payload?.headers, "from"),
                to: parsedAddressText(parsed?.to) || gmailHeader(detail.data.payload?.headers, "to"),
                subject: parsed?.subject ?? gmailHeader(detail.data.payload?.headers, "subject"),
                date: parsed?.date?.toISOString() ?? gmailHeader(detail.data.payload?.headers, "date"),
                isUnread: detail.data.labelIds?.includes("UNREAD") ?? false,
                snippet: detail.data.snippet ?? collapseWhitespace(body).slice(0, 240),
                body,
                hasAttachments: Boolean(parsed?.attachments.length),
            };
        });
    }
    async replyImap(folder, uid, input) {
        const original = await this.withImap(async (client) => {
            await client.mailboxOpen(folder);
            const message = await client.fetchOne(uid, { envelope: true }, { uid: true });
            if (!message || !message.envelope)
                throw new Error("Original message was not found");
            return message.envelope;
        });
        const primary = formatImapAddresses(original.replyTo?.length ? original.replyTo : original.from);
        if (!primary)
            throw new Error("Original message has no reply address");
        const ownAddresses = [this.config.defaultFrom, this.config.smtp?.user ?? ""];
        const cc = input.replyAll
            ? uniqueAddresses([...(original.to ?? []), ...(original.cc ?? [])]
                .map((address) => address.address ?? "")
                .filter(Boolean), [...ownAddresses, ...primary.split(",")])
            : [];
        const subject = /^re:/i.test(original.subject ?? "")
            ? original.subject ?? ""
            : `Re: ${original.subject ?? ""}`;
        const mail = {
            from: this.config.defaultFrom,
            to: primary,
            ...(cc.length ? { cc } : {}),
            subject,
            inReplyTo: original.messageId,
            references: original.messageId ? [original.messageId] : undefined,
            ...(input.html ? { html: input.body } : { text: input.body }),
        };
        const response = await this.smtpTransport().sendMail(mail);
        return {
            ok: true,
            account: accountLabel(this.config),
            provider: this.config.provider,
            messageId: response.messageId,
            inReplyTo: input.messageId,
            to: primary,
            cc,
            subject,
        };
    }
    async replyGmail(id, input) {
        const gmail = this.gmailClient();
        const original = await gmail.users.messages.get({ userId: "me", id, format: "raw" });
        if (!original.data.raw)
            throw new Error("Original message source was not found");
        const parsed = await simpleParser(decodeGmailRaw(original.data.raw));
        const primary = parsedAddressValues(parsed.replyTo).concat(parsedAddressValues(parsed.from));
        const to = uniqueAddresses(primary)[0];
        if (!to)
            throw new Error("Original message has no reply address");
        const ownAddresses = [this.config.defaultFrom];
        const cc = input.replyAll
            ? uniqueAddresses([...parsedAddressValues(parsed.to), ...parsedAddressValues(parsed.cc)], [...ownAddresses, to])
            : [];
        const subject = /^re:/i.test(parsed.subject ?? "")
            ? parsed.subject ?? ""
            : `Re: ${parsed.subject ?? ""}`;
        const raw = await buildRawMime({
            from: this.config.defaultFrom,
            to,
            ...(cc.length ? { cc } : {}),
            subject,
            inReplyTo: parsed.messageId,
            references: [
                ...(Array.isArray(parsed.references)
                    ? parsed.references
                    : parsed.references
                        ? [parsed.references]
                        : []),
                ...(parsed.messageId ? [parsed.messageId] : []),
            ],
            ...(input.html ? { html: input.body } : { text: input.body }),
        });
        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encodeGmailRaw(raw), threadId: original.data.threadId },
        });
        return {
            ok: true,
            account: accountLabel(this.config),
            provider: this.config.provider,
            messageId: response.data.id ?? "",
            inReplyTo: input.messageId,
            to,
            cc,
            subject,
        };
    }
}
