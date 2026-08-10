import { EmailService } from "../email/emailService.js";
import { toolError, toolSuccess } from "./toolResult.js";
export function createReadEmailsTool(resolveConfig) {
    return async ({ account, ...input }) => {
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
        }
        catch (error) {
            return toolError("Failed to read emails", error);
        }
    };
}
