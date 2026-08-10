import { EmailService } from "../email/emailService.js";
import { toolError, toolSuccess } from "./toolResult.js";
export function createSearchEmailsTool(resolveConfig) {
    return async ({ account, ...input }) => {
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
        }
        catch (error) {
            return toolError("Failed to search emails", error);
        }
    };
}
