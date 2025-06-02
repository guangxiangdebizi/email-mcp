import { google } from "googleapis";
export function createDeleteEmailTool() {
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
            // Delete the email
            await gmail.users.messages.delete({
                userId: "me",
                id: args.messageId,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Email deleted successfully!\n\nMessage ID: ${args.messageId}`,
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
                        text: `❌ Failed to delete email: ${errorMessage}`,
                    },
                ],
            };
        }
    };
}
