#!/usr/bin/env node
import { type IncomingMessage, type ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { type Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const EMAIL_TOOLS: Tool[];
export declare function createEmailMcpServer(headers?: IncomingMessage["headers"], env?: NodeJS.ProcessEnv): Server;
export interface HttpServerOptions {
    env?: NodeJS.ProcessEnv;
}
export declare function createHttpServer(options?: HttpServerOptions): import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
export declare function startHttpServer(env?: NodeJS.ProcessEnv): Promise<import("http").Server<typeof IncomingMessage, typeof ServerResponse>>;
