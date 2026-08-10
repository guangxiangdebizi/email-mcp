import type { EmailConfig } from "../config.js";
import { EmailService, type SendEmailInput } from "../email/emailService.js";
import { toolError, toolSuccess, type EmailConfigResolver } from "./toolResult.js";

export interface SendEmailArgs extends SendEmailInput {
  account?: string;
}

export function createSendEmailTool(resolveConfig: EmailConfigResolver) {
  return async ({ account, ...input }: SendEmailArgs) => {
    try {
      const config: EmailConfig = resolveConfig(account);
      return toolSuccess(await new EmailService(config).send(input));
    } catch (error) {
      return toolError("Failed to send email", error);
    }
  };
}
