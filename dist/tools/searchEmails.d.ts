interface SearchEmailsArgs {
    query: string;
    limit: number;
    folder: string;
}
export declare function createSearchEmailsTool(): (args: SearchEmailsArgs) => Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
