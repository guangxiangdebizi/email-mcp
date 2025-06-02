interface ReadEmailsArgs {
    limit: number;
    folder: string;
    unreadOnly: boolean;
}
export declare function createReadEmailsTool(): (args: ReadEmailsArgs) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
