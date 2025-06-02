#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";

// Import email tools
import { createSendEmailTool } from "./tools/sendEmail.js";
import { createReadEmailsTool } from "./tools/readEmails.js";
import { createSearchEmailsTool } from "./tools/searchEmails.js";
import { createDeleteEmailTool } from "./tools/deleteEmail.js";
import { createReplyEmailTool } from "./tools/replyEmail.js";

// Load environment variables
dotenv.config();

// Validation schemas
const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  from: z.string().email().optional(),
  html: z.boolean().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

const ReadEmailsSchema = z.object({
  limit: z.number().optional().default(10),
  folder: z.string().optional().default("INBOX"),
  unreadOnly: z.boolean().optional().default(false),
});

const SearchEmailsSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
  folder: z.string().optional().default("INBOX"),
});

const DeleteEmailSchema = z.object({
  messageId: z.string(),
});

const ReplyEmailSchema = z.object({
  messageId: z.string(),
  body: z.string(),
  replyAll: z.boolean().optional().default(false),
  html: z.boolean().optional().default(false),
});

class EmailMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "email-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "send_email",
          description: "Send an email to specified recipients",
          inputSchema: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address",
              },
              subject: {
                type: "string",
                description: "Email subject",
              },
              body: {
                type: "string",
                description: "Email body content",
              },
              from: {
                type: "string",
                description: "Sender email address (optional)",
              },
              html: {
                type: "boolean",
                description: "Whether the body is HTML format",
              },
              attachments: {
                type: "array",
                description: "Email attachments",
                items: {
                  type: "object",
                  properties: {
                    filename: { type: "string" },
                    path: { type: "string" },
                    content: { type: "string" },
                  },
                },
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "read_emails",
          description: "Read emails from inbox or specified folder",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of emails to retrieve (default: 10)",
              },
              folder: {
                type: "string",
                description: "Email folder to read from (default: INBOX)",
              },
              unreadOnly: {
                type: "boolean",
                description: "Only retrieve unread emails",
              },
            },
          },
        },
        {
          name: "search_emails",
          description: "Search emails by query",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              limit: {
                type: "number",
                description: "Number of results to return (default: 10)",
              },
              folder: {
                type: "string",
                description: "Folder to search in (default: INBOX)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "delete_email",
          description: "Delete an email by message ID",
          inputSchema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Email message ID to delete",
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "reply_email",
          description: "Reply to an email",
          inputSchema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Original message ID to reply to",
              },
              body: {
                type: "string",
                description: "Reply body content",
              },
              replyAll: {
                type: "boolean",
                description: "Reply to all recipients",
              },
              html: {
                type: "boolean",
                description: "Whether the body is HTML format",
              },
            },
            required: ["messageId", "body"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "send_email": {
            const args = SendEmailSchema.parse(request.params.arguments);
            const sendEmailTool = createSendEmailTool();
            return await sendEmailTool(args);
          }

          case "read_emails": {
            const args = ReadEmailsSchema.parse(request.params.arguments || {});
            const readEmailsTool = createReadEmailsTool();
            return await readEmailsTool(args);
          }

          case "search_emails": {
            const args = SearchEmailsSchema.parse(request.params.arguments);
            const searchEmailsTool = createSearchEmailsTool();
            return await searchEmailsTool(args);
          }

          case "delete_email": {
            const args = DeleteEmailSchema.parse(request.params.arguments);
            const deleteEmailTool = createDeleteEmailTool();
            return await deleteEmailTool(args);
          }

          case "reply_email": {
            const args = ReplyEmailSchema.parse(request.params.arguments);
            const replyEmailTool = createReplyEmailTool();
            return await replyEmailTool(args);
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Email MCP Server running on stdio");
  }
}

// Start the server
const server = new EmailMCPServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 