import { type EmailConfig } from "../config.js";
export interface AttachmentInput {
    filename: string;
    path?: string;
    content?: string;
}
export interface SendEmailInput {
    to: string;
    subject: string;
    body: string;
    from?: string;
    html?: boolean;
    attachments?: AttachmentInput[];
}
export interface ReadEmailsInput {
    limit: number;
    folder: string;
    unreadOnly: boolean;
}
export interface SearchEmailsInput {
    query: string;
    limit: number;
    folder: string;
}
export interface ReplyEmailInput {
    messageId: string;
    body: string;
    replyAll: boolean;
    html: boolean;
}
export interface EmailSummary {
    messageId: string;
    internetMessageId?: string;
    threadId?: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    isUnread: boolean;
    snippet: string;
    body: string;
    hasAttachments: boolean;
}
export interface OperationResult {
    ok: true;
    account: string;
    provider: string;
    [key: string]: unknown;
}
export declare class EmailService {
    private readonly config;
    constructor(config: EmailConfig);
    private gmailClient;
    private imapClient;
    private smtpTransport;
    private withImap;
    send(input: SendEmailInput): Promise<OperationResult>;
    read(input: ReadEmailsInput): Promise<EmailSummary[]>;
    search(input: SearchEmailsInput): Promise<EmailSummary[]>;
    delete(messageId: string): Promise<OperationResult>;
    reply(input: ReplyEmailInput): Promise<OperationResult>;
    private readImap;
    private imapSummary;
    private readGmail;
    private replyImap;
    private replyGmail;
}
