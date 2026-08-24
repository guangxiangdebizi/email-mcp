import type { IncomingHttpHeaders } from "node:http";

export type EmailProvider = "imap-smtp" | "gmail-api";
export type EmailOperation = "send" | "read" | "search" | "delete" | "reply";

export interface MailServerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  accessToken?: string;
  tlsRejectUnauthorized: boolean;
}

export interface GmailApiConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
}

export interface EmailConfig {
  account?: string;
  provider: EmailProvider;
  defaultFrom: string;
  allowInsecureTransport: boolean;
  allowInvalidTlsCertificates: boolean;
  smtp?: MailServerConfig;
  imap?: MailServerConfig;
  gmail?: GmailApiConfig;
}

type HeaderMap = IncomingHttpHeaders | Record<string, string | string[] | undefined>;
type UnknownRecord = Record<string, unknown>;

interface PartialMailServerConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  accessToken?: string;
  tlsRejectUnauthorized?: boolean;
}

interface PartialEmailConfig {
  account?: string;
  provider?: EmailProvider;
  defaultFrom?: string;
  smtp?: PartialMailServerConfig;
  imap?: PartialMailServerConfig;
  gmail?: GmailApiConfig;
}

export interface ResolveEmailConfigOptions {
  env?: NodeJS.ProcessEnv;
  headers?: HeaderMap;
  account?: string;
}

interface ProviderPreset {
  smtp: Pick<MailServerConfig, "host" | "port" | "secure">;
  imap: Pick<MailServerConfig, "host" | "port" | "secure">;
}

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  "qq.com": {
    smtp: { host: "smtp.qq.com", port: 465, secure: true },
    imap: { host: "imap.qq.com", port: 993, secure: true },
  },
  "foxmail.com": {
    smtp: { host: "smtp.qq.com", port: 465, secure: true },
    imap: { host: "imap.qq.com", port: 993, secure: true },
  },
  "163.com": {
    smtp: { host: "smtp.163.com", port: 465, secure: true },
    imap: { host: "imap.163.com", port: 993, secure: true },
  },
  "126.com": {
    smtp: { host: "smtp.126.com", port: 465, secure: true },
    imap: { host: "imap.126.com", port: 993, secure: true },
  },
  "yeah.net": {
    smtp: { host: "smtp.yeah.net", port: 465, secure: true },
    imap: { host: "imap.yeah.net", port: 993, secure: true },
  },
  "gmail.com": {
    smtp: { host: "smtp.gmail.com", port: 465, secure: true },
    imap: { host: "imap.gmail.com", port: 993, secure: true },
  },
  "googlemail.com": {
    smtp: { host: "smtp.gmail.com", port: 465, secure: true },
    imap: { host: "imap.gmail.com", port: 993, secure: true },
  },
  "outlook.com": {
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    imap: { host: "outlook.office365.com", port: 993, secure: true },
  },
  "hotmail.com": {
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    imap: { host: "outlook.office365.com", port: 993, secure: true },
  },
  "live.com": {
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    imap: { host: "outlook.office365.com", port: 993, secure: true },
  },
  "yahoo.com": {
    smtp: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
  },
  "icloud.com": {
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
  },
  "me.com": {
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
  },
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberValue(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return parsed;
}

function booleanValue(value: unknown, name: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
    if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  }
  throw new Error(`${name} must be true or false`);
}

function normalizeProvider(value: unknown): EmailProvider | undefined {
  const provider = stringValue(value)?.toLowerCase();
  if (!provider) return undefined;
  if (["smtp", "imap", "imap-smtp", "standard"].includes(provider)) return "imap-smtp";
  if (["gmail", "gmail-api", "gmail_api"].includes(provider)) return "gmail-api";
  throw new Error(`Unsupported EMAIL_PROVIDER: ${String(value)}`);
}

function normalizeServer(value: unknown, label: string): PartialMailServerConfig | undefined {
  if (!isRecord(value)) return undefined;
  const auth = isRecord(value.auth) ? value.auth : {};
  return {
    host: stringValue(value.host),
    port: numberValue(value.port, `${label}.port`),
    secure: booleanValue(value.secure, `${label}.secure`),
    user: stringValue(value.user) ?? stringValue(auth.user),
    pass: stringValue(value.pass) ?? stringValue(auth.pass),
    accessToken: stringValue(value.accessToken) ?? stringValue(auth.accessToken),
    tlsRejectUnauthorized: booleanValue(
      value.tlsRejectUnauthorized,
      `${label}.tlsRejectUnauthorized`,
    ),
  };
}

function normalizePartialConfig(value: unknown): PartialEmailConfig {
  if (!isRecord(value)) throw new Error("Email account configuration must be a JSON object");
  const smtp = normalizeServer(value.smtp, "smtp");
  const imap = normalizeServer(value.imap, "imap");
  const gmail = isRecord(value.gmail)
    ? {
        clientId: stringValue(value.gmail.clientId),
        clientSecret: stringValue(value.gmail.clientSecret),
        refreshToken: stringValue(value.gmail.refreshToken),
        accessToken: stringValue(value.gmail.accessToken),
      }
    : undefined;

  return {
    account: stringValue(value.account),
    provider:
      normalizeProvider(value.provider) ??
      (gmail ? "gmail-api" : smtp || imap ? "imap-smtp" : undefined),
    defaultFrom: stringValue(value.defaultFrom) ?? stringValue(value.from),
    smtp,
    imap,
    gmail,
  };
}

function mergeServer(
  base?: PartialMailServerConfig,
  override?: PartialMailServerConfig,
): PartialMailServerConfig | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...withoutUndefined(override ?? {}) };
}

function mergeConfig(base: PartialEmailConfig, override: PartialEmailConfig): PartialEmailConfig {
  return {
    ...base,
    ...withoutUndefined({
      account: override.account,
      provider: override.provider,
      defaultFrom: override.defaultFrom,
    }),
    smtp: mergeServer(base.smtp, override.smtp),
    imap: mergeServer(base.imap, override.imap),
    gmail:
      base.gmail || override.gmail
        ? { ...base.gmail, ...withoutUndefined(override.gmail ?? {}) }
        : undefined,
  };
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function readHeader(headers: HeaderMap | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target) continue;
    return stringValue(Array.isArray(value) ? value[0] : value);
  }
  return undefined;
}

function parseJsonObject(raw: string, label: string): UnknownRecord {
  if (raw.length > 64 * 1024) throw new Error(`${label} is too large`);
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error("must be a JSON object");
    return parsed;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${detail}`);
  }
}

function parseHeaderConfig(headers: HeaderMap | undefined): PartialEmailConfig {
  const raw = readHeader(headers, "x-email-config");
  if (!raw) return {};

  let json = raw;
  if (raw.startsWith("base64:")) {
    try {
      json = Buffer.from(raw.slice(7), "base64url").toString("utf8");
    } catch {
      throw new Error("Invalid X-Email-Config base64url value");
    }
  }
  return normalizePartialConfig(parseJsonObject(json, "X-Email-Config"));
}

function configFromHeaders(headers: HeaderMap | undefined): PartialEmailConfig {
  const smtp: PartialMailServerConfig = {
    host: readHeader(headers, "x-email-smtp-host"),
    port: numberValue(readHeader(headers, "x-email-smtp-port"), "X-Email-SMTP-Port"),
    secure: booleanValue(readHeader(headers, "x-email-smtp-secure"), "X-Email-SMTP-Secure"),
    user: readHeader(headers, "x-email-smtp-user"),
    pass: readHeader(headers, "x-email-smtp-pass"),
    accessToken: readHeader(headers, "x-email-smtp-access-token"),
    tlsRejectUnauthorized: booleanValue(
      readHeader(headers, "x-email-smtp-tls-reject-unauthorized"),
      "X-Email-SMTP-TLS-Reject-Unauthorized",
    ),
  };
  const imap: PartialMailServerConfig = {
    host: readHeader(headers, "x-email-imap-host"),
    port: numberValue(readHeader(headers, "x-email-imap-port"), "X-Email-IMAP-Port"),
    secure: booleanValue(readHeader(headers, "x-email-imap-secure"), "X-Email-IMAP-Secure"),
    user: readHeader(headers, "x-email-imap-user"),
    pass: readHeader(headers, "x-email-imap-pass"),
    accessToken: readHeader(headers, "x-email-imap-access-token"),
    tlsRejectUnauthorized: booleanValue(
      readHeader(headers, "x-email-imap-tls-reject-unauthorized"),
      "X-Email-IMAP-TLS-Reject-Unauthorized",
    ),
  };
  const gmail: GmailApiConfig = {
    clientId: readHeader(headers, "x-email-gmail-client-id"),
    clientSecret: readHeader(headers, "x-email-gmail-client-secret"),
    refreshToken: readHeader(headers, "x-email-gmail-refresh-token"),
    accessToken: readHeader(headers, "x-email-gmail-access-token"),
  };
  const hasSmtp = Object.values(smtp).some((value) => value !== undefined);
  const hasImap = Object.values(imap).some((value) => value !== undefined);
  const hasGmail = Object.values(gmail).some((value) => value !== undefined);

  return {
    provider:
      normalizeProvider(readHeader(headers, "x-email-provider")) ??
      (hasGmail ? "gmail-api" : hasSmtp || hasImap ? "imap-smtp" : undefined),
    defaultFrom: readHeader(headers, "x-email-from"),
    smtp: hasSmtp ? smtp : undefined,
    imap: hasImap ? imap : undefined,
    gmail: hasGmail ? gmail : undefined,
  };
}

function configFromFlatEnv(env: NodeJS.ProcessEnv): PartialEmailConfig {
  return {
    provider: normalizeProvider(env.EMAIL_PROVIDER) ?? "imap-smtp",
    defaultFrom: stringValue(env.DEFAULT_FROM_EMAIL),
    smtp: {
      host: stringValue(env.SMTP_HOST),
      port: numberValue(env.SMTP_PORT, "SMTP_PORT"),
      secure: booleanValue(env.SMTP_SECURE, "SMTP_SECURE"),
      user: stringValue(env.SMTP_USER),
      pass: stringValue(env.SMTP_PASS),
      accessToken: stringValue(env.SMTP_ACCESS_TOKEN),
      tlsRejectUnauthorized: booleanValue(
        env.SMTP_TLS_REJECT_UNAUTHORIZED,
        "SMTP_TLS_REJECT_UNAUTHORIZED",
      ),
    },
    imap: {
      host: stringValue(env.IMAP_HOST),
      port: numberValue(env.IMAP_PORT, "IMAP_PORT"),
      secure: booleanValue(env.IMAP_SECURE, "IMAP_SECURE"),
      user: stringValue(env.IMAP_USER),
      pass: stringValue(env.IMAP_PASS),
      accessToken: stringValue(env.IMAP_ACCESS_TOKEN),
      tlsRejectUnauthorized: booleanValue(
        env.IMAP_TLS_REJECT_UNAUTHORIZED,
        "IMAP_TLS_REJECT_UNAUTHORIZED",
      ),
    },
    gmail: {
      clientId: stringValue(env.GMAIL_CLIENT_ID),
      clientSecret: stringValue(env.GMAIL_CLIENT_SECRET),
      refreshToken: stringValue(env.GMAIL_REFRESH_TOKEN),
      accessToken: stringValue(env.GMAIL_ACCESS_TOKEN),
    },
  };
}

function parseNamedAccounts(env: NodeJS.ProcessEnv): Record<string, PartialEmailConfig> {
  const raw = stringValue(env.EMAIL_ACCOUNTS_JSON) ?? stringValue(env.EMAIL_ACCOUNTS);
  if (!raw) return {};
  const parsed = parseJsonObject(raw, "EMAIL_ACCOUNTS_JSON");
  return Object.fromEntries(
    Object.entries(parsed).map(([name, config]) => [name, normalizePartialConfig(config)]),
  );
}

function inferPreset(config: PartialEmailConfig): ProviderPreset | undefined {
  const address = config.smtp?.user ?? config.imap?.user ?? config.defaultFrom;
  const domain = address?.split("@").at(-1)?.toLowerCase();
  return domain ? PROVIDER_PRESETS[domain] : undefined;
}

function completeServer(
  partial: PartialMailServerConfig | undefined,
  fallback: PartialMailServerConfig | undefined,
  preset: ProviderPreset["smtp"] | ProviderPreset["imap"] | undefined,
  defaults: { port: number; secure: boolean },
): MailServerConfig | undefined {
  const host = partial?.host ?? preset?.host;
  const user = partial?.user ?? fallback?.user;
  if (!host && !user && !partial?.pass && !partial?.accessToken) return undefined;
  return {
    host: host ?? "",
    port: partial?.port ?? preset?.port ?? defaults.port,
    secure: partial?.secure ?? preset?.secure ?? defaults.secure,
    user: user ?? "",
    pass: partial?.pass ?? fallback?.pass,
    accessToken: partial?.accessToken ?? fallback?.accessToken,
    tlsRejectUnauthorized: partial?.tlsRejectUnauthorized ?? true,
  };
}

export function resolveEmailConfig(options: ResolveEmailConfigOptions = {}): EmailConfig {
  const env = options.env ?? process.env;
  const headers = options.headers;
  const headerJson = parseHeaderConfig(headers);
  const selectedAccount =
    stringValue(options.account) ??
    readHeader(headers, "x-email-account") ??
    headerJson.account ??
    stringValue(env.EMAIL_DEFAULT_ACCOUNT);

  const namedAccounts = parseNamedAccounts(env);
  if (selectedAccount && !namedAccounts[selectedAccount]) {
    throw new Error(`Unknown email account "${selectedAccount}"`);
  }

  const flatConfig = configFromFlatEnv(env);
  let partial = selectedAccount
    ? mergeConfig({ provider: flatConfig.provider }, namedAccounts[selectedAccount])
    : flatConfig;
  partial = mergeConfig(partial, headerJson);
  partial = mergeConfig(partial, configFromHeaders(headers));
  partial.account = selectedAccount;

  const provider = partial.provider ?? "imap-smtp";
  const preset = inferPreset(partial);
  const smtp = completeServer(partial.smtp, partial.imap, preset?.smtp, {
    port: 587,
    secure: false,
  });
  const imap = completeServer(partial.imap, partial.smtp, preset?.imap, {
    port: 993,
    secure: true,
  });

  return {
    account: selectedAccount,
    provider,
    defaultFrom: partial.defaultFrom ?? smtp?.user ?? imap?.user ?? "",
    allowInsecureTransport:
      booleanValue(env.EMAIL_ALLOW_INSECURE_TRANSPORT, "EMAIL_ALLOW_INSECURE_TRANSPORT") ?? false,
    allowInvalidTlsCertificates:
      booleanValue(
        env.EMAIL_ALLOW_INVALID_TLS_CERTIFICATES,
        "EMAIL_ALLOW_INVALID_TLS_CERTIFICATES",
      ) ?? false,
    smtp,
    imap,
    gmail: partial.gmail,
  };
}

function validateServer(
  server: MailServerConfig | undefined,
  protocol: "SMTP" | "IMAP",
  allowInvalidTlsCertificates: boolean,
): void {
  if (!server?.host) throw new Error(`${protocol} host is missing`);
  if (!server.user) throw new Error(`${protocol} user is missing`);
  if (!server.pass && !server.accessToken) {
    throw new Error(`${protocol} password/app password or access token is missing`);
  }
  if (!server.tlsRejectUnauthorized && !allowInvalidTlsCertificates) {
    throw new Error(
      `${protocol} certificate verification cannot be disabled unless EMAIL_ALLOW_INVALID_TLS_CERTIFICATES=true`,
    );
  }
}

export function validateEmailConfig(config: EmailConfig, operation: EmailOperation): void {
  if (config.provider === "gmail-api") {
    const gmail = config.gmail;
    const hasRefreshCredentials = Boolean(
      gmail?.clientId && gmail.clientSecret && gmail.refreshToken,
    );
    if (!gmail?.accessToken && !hasRefreshCredentials) {
      throw new Error(
        "Gmail API credentials are missing: provide an access token or client ID, client secret, and refresh token",
      );
    }
    if (["send", "reply"].includes(operation) && !config.defaultFrom) {
      throw new Error("Default sender address is missing");
    }
    return;
  }

  if (["send", "reply"].includes(operation)) {
    validateServer(config.smtp, "SMTP", config.allowInvalidTlsCertificates);
    if (!config.defaultFrom) throw new Error("Default sender address is missing");
  } else {
    validateServer(config.imap, "IMAP", config.allowInvalidTlsCertificates);
  }
}

export function getRequestAccount(headers: HeaderMap | undefined): string | undefined {
  return readHeader(headers, "x-email-account");
}

export const EMAIL_CONFIG_HEADERS = [
  "X-Email-Account",
  "X-Email-Config",
  "X-Email-Provider",
  "X-Email-From",
  "X-Email-SMTP-Host",
  "X-Email-SMTP-Port",
  "X-Email-SMTP-Secure",
  "X-Email-SMTP-User",
  "X-Email-SMTP-Pass",
  "X-Email-SMTP-Access-Token",
  "X-Email-SMTP-TLS-Reject-Unauthorized",
  "X-Email-IMAP-Host",
  "X-Email-IMAP-Port",
  "X-Email-IMAP-Secure",
  "X-Email-IMAP-User",
  "X-Email-IMAP-Pass",
  "X-Email-IMAP-Access-Token",
  "X-Email-IMAP-TLS-Reject-Unauthorized",
  "X-Email-Gmail-Client-Id",
  "X-Email-Gmail-Client-Secret",
  "X-Email-Gmail-Refresh-Token",
  "X-Email-Gmail-Access-Token",
] as const;
