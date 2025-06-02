interface ReplyEmailArgs {
    messageId: string;
    body: string;
    replyAll: boolean;
    html: boolean;
}
export declare function createReplyEmailTool(): (args: ReplyEmailArgs) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
