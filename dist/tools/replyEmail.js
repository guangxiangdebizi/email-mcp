import { google } from "googleapis";
export function createReplyEmailTool() {
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
            // Get original message
            const originalMessage = await gmail.users.messages.get({
                userId: "me",
                id: args.messageId,
            });
            const payload = originalMessage.data.payload;
            if (!payload?.headers) {
                throw new Error("Could not find original message headers");
            }
            // Parse headers
            const headers = payload.headers.reduce((acc, header) => {
                acc[header.name.toLowerCase()] = header.value;
                return acc;
            }, {});
            const originalSubject = headers.subject || "";
            const replySubject = originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`;
            const originalFrom = headers.from || "";
            // Get recipients
            let toAddresses = originalFrom;
            if (args.replyAll) {
                const originalTo = headers.to || "";
                const originalCc = headers.cc || "";
                toAddresses = [originalFrom, originalTo, originalCc].filter(addr => addr).join(", ");
            }
            // Create reply email
            const emailLines = [
                `To: ${toAddresses}`,
                `Subject: ${replySubject}`,
                `In-Reply-To: ${headers["message-id"] || ""}`,
                `References: ${headers.references || headers["message-id"] || ""}`,
                `Content-Type: ${args.html ? "text/html" : "text/plain"}; charset=utf-8`,
                "",
                args.body,
            ];
            const email = emailLines.join("\n");
            const encodedEmail = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
            const result = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedEmail,
                    threadId: originalMessage.data.threadId,
                },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Reply sent successfully!\n\nDetails:\n- To: ${toAddresses}\n- Subject: ${replySubject}\n- Message ID: ${result.data.id}\n- Reply All: ${args.replyAll ? "Yes" : "No"}\n- Format: ${args.html ? "HTML" : "Plain Text"}`,
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
                        text: `❌ Failed to reply to email: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}
