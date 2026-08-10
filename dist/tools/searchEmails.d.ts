import { type SearchEmailsInput } from "../email/emailService.js";
import { type EmailConfigResolver } from "./toolResult.js";
export interface SearchEmailsArgs extends SearchEmailsInput {
    account?: string;
}
export declare function createSearchEmailsTool(resolveConfig: EmailConfigResolver): ({ account, ...input }: SearchEmailsArgs) => Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
