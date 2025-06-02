import nodemailer from "nodemailer";
import { gmail_v1, google } from "googleapis";
import fs from "fs/promises";

interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
  from?: string;
  html?: boolean;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string;
  }>;
}

interface EmailConfig {
  provider: "smtp" | "gmail";
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  gmail?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
  };
  defaultFrom: string;
}

function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "smtp") as "smtp" | "gmail";
  
  if (provider === "gmail") {
    return {
      provider: "gmail",
      gmail: {
        clientId: process.env.GMAIL_CLIENT_ID!,
        clientSecret: process.env.GMAIL_CLIENT_SECRET!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
        accessToken: process.env.GMAIL_ACCESS_TOKEN,
      },
      defaultFrom: process.env.DEFAULT_FROM_EMAIL!,
    };
  }

  return {
    provider: "smtp",
    smtp: {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    defaultFrom: process.env.DEFAULT_FROM_EMAIL!,
  };
}

async function sendViaGmail(args: SendEmailArgs, config: EmailConfig) {
  const oauth2Client = new google.auth.OAuth2(
    config.gmail!.clientId,
    config.gmail!.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.gmail!.refreshToken,
    access_token: config.gmail!.accessToken,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Create email content
  const emailLines = [
    `To: ${args.to}`,
    `From: ${args.from || config.defaultFrom}`,
    `Subject: ${args.subject}`,
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
    },
  });

  return {
    success: true,
    messageId: result.data.id,
    provider: "gmail",
  };
}

async function sendViaSMTP(args: SendEmailArgs, config: EmailConfig) {
  const transporter = nodemailer.createTransport({
    host: config.smtp!.host,
    port: config.smtp!.port,
    secure: config.smtp!.secure,
    auth: config.smtp!.auth,
  });

  // Process attachments
  const attachments = [];
  if (args.attachments) {
    for (const attachment of args.attachments) {
      if (attachment.path) {
        // File attachment
        attachments.push({
          filename: attachment.filename,
          path: attachment.path,
        });
      } else if (attachment.content) {
        // Content attachment
        attachments.push({
          filename: attachment.filename,
          content: attachment.content,
        });
      }
    }
  }

  const mailOptions = {
    from: args.from || config.defaultFrom,
    to: args.to,
    subject: args.subject,
    [args.html ? "html" : "text"]: args.body,
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  const result = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: result.messageId,
    provider: "smtp",
  };
}

export function createSendEmailTool() {
  return async (args: SendEmailArgs) => {
    try {
      const config = getEmailConfig();
      
      // Validate required environment variables
      if (config.provider === "gmail") {
        if (!config.gmail?.clientId || !config.gmail?.clientSecret || !config.gmail?.refreshToken) {
          throw new Error("Gmail configuration missing. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN");
        }
      } else {
        if (!config.smtp?.auth.user || !config.smtp?.auth.pass) {
          throw new Error("SMTP configuration missing. Please set SMTP_USER and SMTP_PASS");
        }
      }

      if (!config.defaultFrom) {
        throw new Error("DEFAULT_FROM_EMAIL environment variable is required");
      }

      let result;
      if (config.provider === "gmail") {
        result = await sendViaGmail(args, config);
      } else {
        result = await sendViaSMTP(args, config);
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ Email sent successfully!\n\nDetails:\n- To: ${args.to}\n- Subject: ${args.subject}\n- Provider: ${result.provider}\n- Message ID: ${result.messageId}\n- Format: ${args.html ? "HTML" : "Plain Text"}${args.attachments ? `\n- Attachments: ${args.attachments.length}` : ""}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to send email: ${errorMessage}`,
          },
        ],
      };
    }
  };
} 