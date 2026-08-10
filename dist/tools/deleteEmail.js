import { EmailService } from "../email/emailService.js";
import { getMessageLocatorAccount } from "../email/messageLocator.js";
import { toolError, toolSuccess } from "./toolResult.js";
export function createDeleteEmailTool(resolveConfig) {
    return async ({ messageId, account }) => {
        try {
            const config = resolveConfig(account ?? getMessageLocatorAccount(messageId));
            return toolSuccess(await new EmailService(config).delete(messageId));
        }
        catch (error) {
            return toolError("Failed to delete email", error);
        }
    };
}
