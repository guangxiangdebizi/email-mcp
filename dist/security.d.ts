import type { IncomingMessage, ServerResponse } from "node:http";
import type { ServerOptions as HttpsServerOptions } from "node:https";
export declare function envBoolean(env: NodeJS.ProcessEnv, name: string, defaultValue?: boolean): boolean;
export declare function isLoopbackHost(host: string): boolean;
export declare function loadTlsServerOptions(env: NodeJS.ProcessEnv): HttpsServerOptions | undefined;
export declare function assertSecureDeployment(env: NodeJS.ProcessEnv, host: string, tlsEnabled: boolean): void;
export declare function requestUsesTls(req: IncomingMessage, env: NodeJS.ProcessEnv): boolean;
export declare function applySecurityHeaders(req: IncomingMessage, res: ServerResponse, env: NodeJS.ProcessEnv): void;
