import { google } from "googleapis";
export function createSearchEmailsTool() {
    return async (args) => {
        try {
            const config = {
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: process.env.GMAIL_ACCESS_TOKEN,
            };
            if (!config.clientId || !config.clientSecret || !config.refreshToken) {
                throw new Error("Gmail configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN");
            }
            const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
            oauth2Client.setCredentials({
                refresh_token: config.refreshToken,
                access_token: config.accessToken,
            });
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            // Build search query
            let searchQuery = args.query;
            if (args.folder !== "INBOX") {
                searchQuery += ` in:${args.folder}`;
            }
            const messagesResponse = await gmail.users.messages.list({
                userId: "me",
                q: searchQuery,
                maxResults: args.limit,
            });
            const messages = messagesResponse.data.messages || [];
            const emails = [];
            for (const message of messages) {
                if (!message.id)
                    continue;
                const messageDetail = await gmail.users.messages.get({
                    userId: "me",
                    id: message.id,
                });
                const payload = messageDetail.data.payload;
                if (!payload?.headers)
                    continue;
                const headers = payload.headers.reduce((acc, header) => {
                    acc[header.name.toLowerCase()] = header.value;
                    return acc;
                }, {});
                emails.push({
                    id: message.id,
                    from: headers.from || "",
                    to: headers.to || "",
                    subject: headers.subject || "",
                    snippet: messageDetail.data.snippet || "",
                    date: headers.date || "",
                });
            }
            const resultText = emails.length > 0
                ? `🔍 Found ${emails.length} email(s) matching "${args.query}":\n\n` +
                    emails.map((email, index) => `${index + 1}. **${email.subject}**\n` +
                        `   From: ${email.from}\n` +
                        `   Date: ${email.date}\n` +
                        `   Snippet: ${email.snippet}\n` +
                        `   Message ID: ${email.id}\n` +
                        `   ---\n`).join("\n")
                : `🔍 No emails found matching "${args.query}" in ${args.folder}`;
            return {
                content: [
                    {
                        type: "text",
                        text: resultText,
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Failed to search emails: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}
