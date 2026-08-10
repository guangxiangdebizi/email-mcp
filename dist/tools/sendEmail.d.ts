import { type SendEmailInput } from "../email/emailService.js";
import { type EmailConfigResolver } from "./toolResult.js";
export interface SendEmailArgs extends SendEmailInput {
    account?: string;
}
export declare function createSendEmailTool(resolveConfig: EmailConfigResolver): ({ account, ...input }: SendEmailArgs) => Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
