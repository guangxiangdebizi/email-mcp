import { EmailService } from "../email/emailService.js";
import { toolError, toolSuccess } from "./toolResult.js";
export function createSendEmailTool(resolveConfig) {
    return async ({ account, ...input }) => {
        try {
            const config = resolveConfig(account);
            return toolSuccess(await new EmailService(config).send(input));
        }
        catch (error) {
            return toolError("Failed to send email", error);
        }
    };
}
