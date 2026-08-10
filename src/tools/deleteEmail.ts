import { EmailService } from "../email/emailService.js";
import { getMessageLocatorAccount } from "../email/messageLocator.js";
import { toolError, toolSuccess, type EmailConfigResolver } from "./toolResult.js";

export interface DeleteEmailArgs {
  messageId: string;
  account?: string;
}

export function createDeleteEmailTool(resolveConfig: EmailConfigResolver) {
  return async ({ messageId, account }: DeleteEmailArgs) => {
    try {
      const config = resolveConfig(account ?? getMessageLocatorAccount(messageId));
      return toolSuccess(await new EmailService(config).delete(messageId));
    } catch (error) {
      return toolError("Failed to delete email", error);
    }
  };
}
