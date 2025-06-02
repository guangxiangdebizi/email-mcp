import { google } from "googleapis";

interface ReadEmailsArgs {
  limit: number;
  folder: string;
  unreadOnly: boolean;
}

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  body?: string;
}

function getGmailConfig() {
  return {
    clientId: process.env.GMAIL_CLIENT_ID!,
    clientSecret: process.env.GMAIL_CLIENT_SECRET!,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
    accessToken: process.env.GMAIL_ACCESS_TOKEN,
  };
}

async function getGmailClient() {
  const config = getGmailConfig();
  
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error("Gmail configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN");
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
    access_token: config.accessToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

function parseEmailHeaders(headers: any[]): { from: string; to: string; subject: string; date: string } {
  const result = { from: "", to: "", subject: "", date: "" };
  
  for (const header of headers) {
    switch (header.name.toLowerCase()) {
      case "from":
        result.from = header.value;
        break;
      case "to":
        result.to = header.value;
        break;
      case "subject":
        result.subject = header.value;
        break;
      case "date":
        result.date = header.value;
        break;
    }
  }
  
  return result;
}

function extractEmailBody(payload: any): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
    
    // If no plain text, try HTML
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
  }
  
  return "";
}

export function createReadEmailsTool() {
  return async (args: ReadEmailsArgs) => {
    try {
      const gmail = await getGmailClient();
      
      // Build query
      let query = "";
      if (args.folder !== "INBOX") {
        query += `in:${args.folder}`;
      }
      if (args.unreadOnly) {
        query += query ? " is:unread" : "is:unread";
      }

      // Get message list
      const messagesResponse = await gmail.users.messages.list({
        userId: "me",
        q: query || undefined,
        maxResults: args.limit,
      });

      const messages = messagesResponse.data.messages || [];
      const emails: EmailMessage[] = [];

      // Get details for each message
      for (const message of messages) {
        if (!message.id) continue;

        const messageDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
        });

        const payload = messageDetail.data.payload;
        if (!payload?.headers) continue;

        const headers = parseEmailHeaders(payload.headers);
        const body = extractEmailBody(payload);
        
        const isUnread = messageDetail.data.labelIds?.includes("UNREAD") || false;

        emails.push({
          id: message.id,
          threadId: messageDetail.data.threadId || "",
          from: headers.from,
          to: headers.to,
          subject: headers.subject,
          snippet: messageDetail.data.snippet || "",
          date: headers.date,
          isUnread,
          body: body.length > 1000 ? body.substring(0, 1000) + "..." : body,
        });
      }

      const resultText = emails.length > 0 
        ? `📧 Found ${emails.length} email(s):\n\n` + 
          emails.map((email, index) => 
            `${index + 1}. ${email.isUnread ? "🔵 " : ""}**${email.subject}**\n` +
            `   From: ${email.from}\n` +
            `   Date: ${email.date}\n` +
            `   Snippet: ${email.snippet}\n` +
            `   Message ID: ${email.id}\n` +
            (email.body ? `   Body Preview: ${email.body.substring(0, 200)}...\n` : "") +
            `   ---\n`
          ).join("\n")
        : `📭 No emails found in ${args.folder}${args.unreadOnly ? " (unread only)" : ""}`;

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to read emails: ${errorMessage}`,
          },
        ],
      };
    }
  };
} 