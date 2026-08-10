import { EmailService, type ReplyEmailInput } from "../email/emailService.js";
import { getMessageLocatorAccount } from "../email/messageLocator.js";
import { toolError, toolSuccess, type EmailConfigResolver } from "./toolResult.js";

export interface ReplyEmailArgs extends ReplyEmailInput {
  account?: string;
}

export function createReplyEmailTool(resolveConfig: EmailConfigResolver) {
  return async ({ account, ...input }: ReplyEmailArgs) => {
    try {
      const config = resolveConfig(account ?? getMessageLocatorAccount(input.messageId));
      return toolSuccess(await new EmailService(config).reply(input));
    } catch (error) {
      return toolError("Failed to reply to email", error);
    }
  };
}
