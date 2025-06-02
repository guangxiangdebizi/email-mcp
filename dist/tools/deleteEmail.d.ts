interface DeleteEmailArgs {
    messageId: string;
}
export declare function createDeleteEmailTool(): (args: DeleteEmailArgs) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
