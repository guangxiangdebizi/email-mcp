import { type ReadEmailsInput } from "../email/emailService.js";
import { type EmailConfigResolver } from "./toolResult.js";
export interface ReadEmailsArgs extends ReadEmailsInput {
    account?: string;
}
export declare function createReadEmailsTool(resolveConfig: EmailConfigResolver): ({ account, ...input }: ReadEmailsArgs) => Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
