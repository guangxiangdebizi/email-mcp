import { EmailService, type ReadEmailsInput } from "../email/emailService.js";
import { toolError, toolSuccess, type EmailConfigResolver } from "./toolResult.js";

export interface ReadEmailsArgs extends ReadEmailsInput {
  account?: string;
}

export function createReadEmailsTool(resolveConfig: EmailConfigResolver) {
  return async ({ account, ...input }: ReadEmailsArgs) => {
    try {
      const config = resolveConfig(account);
      const emails = await new EmailService(config).read(input);
      return toolSuccess({
        ok: true,
        account: config.account ?? config.defaultFrom ?? "default",
        provider: config.provider,
        folder: input.folder,
        count: emails.length,
        emails,
      });
    } catch (error) {
      return toolError("Failed to read emails", error);
    }
  };
}
