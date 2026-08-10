import type { EmailConfig } from "../config.js";
export type EmailConfigResolver = (account?: string) => EmailConfig;
export declare function toolSuccess(value: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function toolError(prefix: string, error: unknown): {
    isError: boolean;
    content: {
        type: "text";
        text: string;
    }[];
};
