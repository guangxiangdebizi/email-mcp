import { type ReplyEmailInput } from "../email/emailService.js";
import { type EmailConfigResolver } from "./toolResult.js";
export interface ReplyEmailArgs extends ReplyEmailInput {
    account?: string;
}
export declare function createReplyEmailTool(resolveConfig: EmailConfigResolver): ({ account, ...input }: ReplyEmailArgs) => Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
