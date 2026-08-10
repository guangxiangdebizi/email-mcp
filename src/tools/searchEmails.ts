import { EmailService, type SearchEmailsInput } from "../email/emailService.js";
import { toolError, toolSuccess, type EmailConfigResolver } from "./toolResult.js";

export interface SearchEmailsArgs extends SearchEmailsInput {
  account?: string;
}

export function createSearchEmailsTool(resolveConfig: EmailConfigResolver) {
  return async ({ account, ...input }: SearchEmailsArgs) => {
    try {
      const config = resolveConfig(account);
      const emails = await new EmailService(config).search(input);
      return toolSuccess({
        ok: true,
        account: config.account ?? config.defaultFrom ?? "default",
        provider: config.provider,
        folder: input.folder,
        query: input.query,
        count: emails.length,
        emails,
      });
    } catch (error) {
      return toolError("Failed to search emails", error);
    }
  };
}
