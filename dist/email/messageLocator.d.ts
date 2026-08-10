export interface ImapMessageLocator {
    provider: "imap";
    folder: string;
    uid: number;
    account?: string;
}
export interface GmailMessageLocator {
    provider: "gmail";
    id: string;
    account?: string;
}
export type MessageLocator = ImapMessageLocator | GmailMessageLocator;
export declare function encodeImapMessageLocator(folder: string, uid: number, account?: string): string;
export declare function encodeGmailMessageLocator(id: string, account?: string): string;
export declare function decodeMessageLocator(value: string, provider: "imap" | "gmail", defaultFolder?: string): MessageLocator;
export declare function getMessageLocatorAccount(value: string): string | undefined;
