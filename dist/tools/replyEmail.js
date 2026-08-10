import { EmailService } from "../email/emailService.js";
import { getMessageLocatorAccount } from "../email/messageLocator.js";
import { toolError, toolSuccess } from "./toolResult.js";
export function createReplyEmailTool(resolveConfig) {
    return async ({ account, ...input }) => {
        try {
            const config = resolveConfig(account ?? getMessageLocatorAccount(input.messageId));
            return toolSuccess(await new EmailService(config).reply(input));
        }
        catch (error) {
            return toolError("Failed to reply to email", error);
        }
    };
}
