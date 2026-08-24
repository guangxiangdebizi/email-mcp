#!/usr/bin/env node
import { timingSafeEqual } from "node:crypto";
import { createServer as createNodeHttpServer } from "node:http";
import { createServer as createNodeHttpsServer } from "node:https";
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from "zod";
import { EMAIL_CONFIG_HEADERS, resolveEmailConfig } from "./config.js";
import { createDeleteEmailTool } from "./tools/deleteEmail.js";
import { createReadEmailsTool } from "./tools/readEmails.js";
import { createReplyEmailTool } from "./tools/replyEmail.js";
import { createSearchEmailsTool } from "./tools/searchEmails.js";
import { createSendEmailTool } from "./tools/sendEmail.js";
import { applySecurityHeaders, assertSecureDeployment, loadTlsServerOptions, requestUsesTls, } from "./security.js";
dotenv.config({ quiet: true });
const AccountSchema = z.string().min(1).max(128).optional();
const SendEmailSchema = z.object({
    account: AccountSchema,
    to: z.string().email(),
    subject: z.string().max(998),
    body: z.string(),
    from: z.string().email().optional(),
    html: z.boolean().optional().default(false),
    attachments: z
        .array(z.object({
        filename: z.string().min(1),
        path: z.string().optional(),
        content: z.string().optional(),
    }))
        .max(20)
        .optional(),
});
const ReadEmailsSchema = z.object({
    account: AccountSchema,
    limit: z.number().int().min(1).max(100).optional().default(10),
    folder: z.string().min(1).optional().default("INBOX"),
    unreadOnly: z.boolean().optional().default(false),
});
const SearchEmailsSchema = z.object({
    account: AccountSchema,
    query: z.string().min(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    folder: z.string().min(1).optional().default("INBOX"),
});
const DeleteEmailSchema = z.object({
    account: AccountSchema,
    messageId: z.string().min(1),
});
const ReplyEmailSchema = z.object({
    account: AccountSchema,
    messageId: z.string().min(1),
    body: z.string(),
    replyAll: z.boolean().optional().default(false),
    html: z.boolean().optional().default(false),
});
const accountProperty = {
    type: "string",
    description: "Optional named account from EMAIL_ACCOUNTS_JSON. Overrides X-Email-Account for this call.",
};
export const EMAIL_TOOLS = [
    {
        name: "send_email",
        description: "Send an email through the selected account using SMTP or Gmail API.",
        inputSchema: {
            type: "object",
            properties: {
                account: accountProperty,
                to: { type: "string", format: "email", description: "Recipient email address." },
                subject: { type: "string", description: "Email subject." },
                body: { type: "string", description: "Email body." },
                from: { type: "string", format: "email", description: "Optional sender override." },
                html: { type: "boolean", description: "Treat body as HTML when true." },
                attachments: {
                    type: "array",
                    description: "Optional attachments from a local path or string content.",
                    items: {
                        type: "object",
                        properties: {
                            filename: { type: "string" },
                            path: { type: "string" },
                            content: { type: "string" },
                        },
                        required: ["filename"],
                    },
                },
            },
            required: ["to", "subject", "body"],
        },
    },
    {
        name: "read_emails",
        description: "Read messages through Gmail API or any standard IMAP mailbox.",
        inputSchema: {
            type: "object",
            properties: {
                account: accountProperty,
                limit: { type: "number", minimum: 1, maximum: 100, description: "Maximum messages." },
                folder: { type: "string", description: "Mailbox folder; defaults to INBOX." },
                unreadOnly: { type: "boolean", description: "Return only unread messages." },
            },
        },
    },
    {
        name: "search_emails",
        description: "Search email. IMAP supports text plus from:, to:, cc:, subject:, since:, before:, and is: filters.",
        inputSchema: {
            type: "object",
            properties: {
                account: accountProperty,
                query: { type: "string", description: "Search text or provider-supported query." },
                limit: { type: "number", minimum: 1, maximum: 100, description: "Maximum messages." },
                folder: { type: "string", description: "Mailbox folder; defaults to INBOX." },
            },
            required: ["query"],
        },
    },
    {
        name: "delete_email",
        description: "Permanently delete a message returned by read_emails or search_emails.",
        inputSchema: {
            type: "object",
            properties: {
                account: accountProperty,
                messageId: { type: "string", description: "Opaque messageId returned by this server." },
            },
            required: ["messageId"],
        },
    },
    {
        name: "reply_email",
        description: "Reply to a message through SMTP or Gmail API, with optional reply-all.",
        inputSchema: {
            type: "object",
            properties: {
                account: accountProperty,
                messageId: { type: "string", description: "Opaque messageId returned by this server." },
                body: { type: "string", description: "Reply body." },
                replyAll: { type: "boolean", description: "Include the original To/Cc recipients." },
                html: { type: "boolean", description: "Treat body as HTML when true." },
            },
            required: ["messageId", "body"],
        },
    },
];
export function createEmailMcpServer(headers = {}, env = process.env) {
    const server = new Server({ name: "email-mcp-server", version: "2.1.1" }, {
        capabilities: { tools: {} },
        instructions: "Use the optional account argument to select an EMAIL_ACCOUNTS_JSON account. " +
            "The server also accepts per-request X-Email-* connection headers.",
    });
    const resolveConfig = (account) => resolveEmailConfig({ env, headers, account });
    const sendEmail = createSendEmailTool(resolveConfig);
    const readEmails = createReadEmailsTool(resolveConfig);
    const searchEmails = createSearchEmailsTool(resolveConfig);
    const deleteEmail = createDeleteEmailTool(resolveConfig);
    const replyEmail = createReplyEmailTool(resolveConfig);
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: EMAIL_TOOLS }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            switch (request.params.name) {
                case "send_email":
                    return sendEmail(SendEmailSchema.parse(request.params.arguments));
                case "read_emails":
                    return readEmails(ReadEmailsSchema.parse(request.params.arguments ?? {}));
                case "search_emails":
                    return searchEmails(SearchEmailsSchema.parse(request.params.arguments));
                case "delete_email":
                    return deleteEmail(DeleteEmailSchema.parse(request.params.arguments));
                case "reply_email":
                    return replyEmail(ReplyEmailSchema.parse(request.params.arguments));
                default:
                    return {
                        isError: true,
                        content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
                    };
            }
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : "Invalid tool arguments";
            return {
                isError: true,
                content: [{ type: "text", text: `Invalid tool arguments: ${detail}` }],
            };
        }
    });
    return server;
}
function writeJson(res, status, value) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(value));
}
function isAuthorized(req, env) {
    const expected = env.MCP_API_KEY;
    if (!expected)
        return true;
    const authorization = req.headers.authorization;
    const supplied = (authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined) ??
        (Array.isArray(req.headers["x-mcp-api-key"])
            ? req.headers["x-mcp-api-key"][0]
            : req.headers["x-mcp-api-key"]);
    if (!supplied)
        return false;
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);
    return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}
function applyCors(req, res, env) {
    const configured = env.MCP_CORS_ORIGIN;
    if (!configured)
        return;
    const origin = req.headers.origin;
    const allowed = configured.split(",").map((value) => value.trim());
    if (configured === "*" || (origin && allowed.includes(origin))) {
        res.setHeader("Access-Control-Allow-Origin", configured === "*" ? "*" : origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", [
        "Authorization",
        "Content-Type",
        "Accept",
        "Mcp-Session-Id",
        "Last-Event-ID",
        "X-MCP-API-Key",
        ...EMAIL_CONFIG_HEADERS,
    ].join(", "));
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}
export function createHttpServer(options = {}) {
    const env = options.env ?? process.env;
    const host = env.MCP_HOST || "127.0.0.1";
    const configuredPath = env.MCP_PATH || "/mcp";
    const mcpPath = configuredPath.startsWith("/") ? configuredPath : `/${configuredPath}`;
    const tlsOptions = options.tls ?? loadTlsServerOptions(env);
    assertSecureDeployment(env, host, Boolean(tlsOptions));
    const requestListener = async (req, res) => {
        applySecurityHeaders(req, res, env);
        applyCors(req, res, env);
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname === "/health" && req.method === "GET") {
            writeJson(res, 200, {
                ok: true,
                name: "email-mcp-server",
                version: "2.1.1",
                transport: "streamable-http",
                tls: requestUsesTls(req, env),
                endpoint: mcpPath,
                toolCount: EMAIL_TOOLS.length,
            });
            return;
        }
        if (url.pathname !== mcpPath) {
            writeJson(res, 404, { error: "Not found" });
            return;
        }
        if (req.method === "OPTIONS") {
            res.writeHead(204).end();
            return;
        }
        if (!isAuthorized(req, env)) {
            res.setHeader("WWW-Authenticate", "Bearer");
            writeJson(res, 401, { error: "Unauthorized" });
            return;
        }
        if (req.method !== "POST") {
            res.setHeader("Allow", "POST, OPTIONS");
            writeJson(res, 405, {
                jsonrpc: "2.0",
                error: { code: -32000, message: "Method not allowed in stateless Streamable HTTP mode" },
                id: null,
            });
            return;
        }
        const mcpServer = createEmailMcpServer(req.headers, env);
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });
        res.once("close", () => void mcpServer.close().catch(() => undefined));
        try {
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res);
        }
        catch (error) {
            console.error("MCP request failed:", error instanceof Error ? error.message : error);
            if (!res.headersSent) {
                writeJson(res, 500, {
                    jsonrpc: "2.0",
                    error: { code: -32603, message: "Internal server error" },
                    id: null,
                });
            }
        }
    };
    const server = tlsOptions
        ? createNodeHttpsServer({ ...tlsOptions, maxHeaderSize: 32 * 1024 }, requestListener)
        : createNodeHttpServer({ maxHeaderSize: 32 * 1024 }, requestListener);
    server.headersTimeout = 15_000;
    server.requestTimeout = 120_000;
    server.keepAliveTimeout = 5_000;
    server.maxRequestsPerSocket = 100;
    return server;
}
export async function startHttpServer(env = process.env) {
    const host = env.MCP_HOST || "127.0.0.1";
    const port = Number(env.MCP_PORT || "3200");
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error("MCP_PORT must be an integer between 0 and 65535");
    }
    const tls = loadTlsServerOptions(env);
    assertSecureDeployment(env, host, Boolean(tls));
    const httpServer = createHttpServer({ env, ...(tls ? { tls } : {}) });
    await new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, resolve);
    });
    const address = httpServer.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    const scheme = tls ? "https" : "http";
    console.error(`Email MCP Server listening on ${scheme}://${host}:${actualPort}${env.MCP_PATH || "/mcp"}`);
    return httpServer;
}
async function main() {
    const httpServer = await startHttpServer();
    const shutdown = () => httpServer.close(() => process.exit(0));
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
