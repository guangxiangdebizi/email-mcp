import type { EmailConfig } from "../config.js";

export type EmailConfigResolver = (account?: string) => EmailConfig;

export function toolSuccess(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

export function toolError(prefix: string, error: unknown) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  return {
    isError: true,
    content: [{ type: "text" as const, text: `${prefix}: ${detail}` }],
  };
}
