import { type EmailConfigResolver } from "./toolResult.js";
export interface DeleteEmailArgs {
    messageId: string;
    account?: string;
}
export declare function createDeleteEmailTool(resolveConfig: EmailConfigResolver): ({ messageId, account }: DeleteEmailArgs) => Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
