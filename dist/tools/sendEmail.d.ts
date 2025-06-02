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
export declare function createSendEmailTool(): (args: SendEmailArgs) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
