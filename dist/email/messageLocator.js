function encode(value) {
    return `${value.provider}:${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
}
export function encodeImapMessageLocator(folder, uid, account) {
    return encode({ provider: "imap", folder, uid, account });
}
export function encodeGmailMessageLocator(id, account) {
    return encode({ provider: "gmail", id, account });
}
function parseEncodedMessageLocator(value) {
    const separator = value.indexOf(":");
    if (separator < 0)
        return undefined;
    const prefix = value.slice(0, separator);
    if (prefix !== "imap" && prefix !== "gmail")
        return undefined;
    try {
        const decoded = JSON.parse(Buffer.from(value.slice(separator + 1), "base64url").toString("utf8"));
        if (!decoded || typeof decoded !== "object")
            throw new Error("not an object");
        const candidate = decoded;
        const account = typeof candidate.account === "string" ? candidate.account : undefined;
        if (prefix === "imap" &&
            candidate.provider === "imap" &&
            typeof candidate.folder === "string" &&
            typeof candidate.uid === "number" &&
            Number.isSafeInteger(candidate.uid) &&
            candidate.uid > 0) {
            return { provider: "imap", folder: candidate.folder, uid: candidate.uid, account };
        }
        if (prefix === "gmail" &&
            candidate.provider === "gmail" &&
            typeof candidate.id === "string" &&
            candidate.id) {
            return { provider: "gmail", id: candidate.id, account };
        }
    }
    catch {
        throw new Error("Invalid email message ID");
    }
    throw new Error("Invalid email message ID");
}
export function decodeMessageLocator(value, provider, defaultFolder = "INBOX") {
    const encoded = parseEncodedMessageLocator(value);
    if (encoded)
        return encoded;
    if (provider === "imap") {
        const uid = Number(value);
        if (!Number.isSafeInteger(uid) || uid <= 0) {
            throw new Error("Invalid IMAP message ID. Use the opaque messageId returned by read_emails or search_emails");
        }
        return { provider: "imap", folder: defaultFolder, uid };
    }
    if (!value.trim())
        throw new Error("Message ID is required");
    return { provider: "gmail", id: value };
}
export function getMessageLocatorAccount(value) {
    return parseEncodedMessageLocator(value)?.account;
}
