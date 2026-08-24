import type { IncomingHttpHeaders } from "node:http";
export type EmailProvider = "imap-smtp" | "gmail-api";
export type EmailOperation = "send" | "read" | "search" | "delete" | "reply";
export interface MailServerConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass?: string;
    accessToken?: string;
    tlsRejectUnauthorized: boolean;
}
export interface GmailApiConfig {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
}
export interface EmailConfig {
    account?: string;
    provider: EmailProvider;
    defaultFrom: string;
    allowInsecureTransport: boolean;
    allowInvalidTlsCertificates: boolean;
    smtp?: MailServerConfig;
    imap?: MailServerConfig;
    gmail?: GmailApiConfig;
}
type HeaderMap = IncomingHttpHeaders | Record<string, string | string[] | undefined>;
export interface ResolveEmailConfigOptions {
    env?: NodeJS.ProcessEnv;
    headers?: HeaderMap;
    account?: string;
}
export declare function resolveEmailConfig(options?: ResolveEmailConfigOptions): EmailConfig;
export declare function validateEmailConfig(config: EmailConfig, operation: EmailOperation): void;
export declare function getRequestAccount(headers: HeaderMap | undefined): string | undefined;
export declare const EMAIL_CONFIG_HEADERS: readonly ["X-Email-Account", "X-Email-Config", "X-Email-Provider", "X-Email-From", "X-Email-SMTP-Host", "X-Email-SMTP-Port", "X-Email-SMTP-Secure", "X-Email-SMTP-User", "X-Email-SMTP-Pass", "X-Email-SMTP-Access-Token", "X-Email-SMTP-TLS-Reject-Unauthorized", "X-Email-IMAP-Host", "X-Email-IMAP-Port", "X-Email-IMAP-Secure", "X-Email-IMAP-User", "X-Email-IMAP-Pass", "X-Email-IMAP-Access-Token", "X-Email-IMAP-TLS-Reject-Unauthorized", "X-Email-Gmail-Client-Id", "X-Email-Gmail-Client-Secret", "X-Email-Gmail-Refresh-Token", "X-Email-Gmail-Access-Token"];
export {};
