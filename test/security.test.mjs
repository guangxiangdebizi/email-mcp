import assert from "node:assert/strict";
import test from "node:test";

import { resolveEmailConfig, validateEmailConfig } from "../dist/config.js";
import { EmailService } from "../dist/email/emailService.js";
import { assertSecureDeployment, loadTlsServerOptions } from "../dist/security.js";

test("network deployments require HTTPS while API-key authentication remains optional", () => {
  assert.doesNotThrow(() => assertSecureDeployment({}, "127.0.0.1", false));
  assert.throws(
    () => assertSecureDeployment({ MCP_API_KEY: "x".repeat(32) }, "0.0.0.0", false),
    /plaintext HTTP/i,
  );
  assert.doesNotThrow(() => assertSecureDeployment({}, "0.0.0.0", true));
  assert.throws(
    () => assertSecureDeployment({ MCP_API_KEY: "short" }, "0.0.0.0", true),
    /at least 32 bytes/i,
  );
  assert.doesNotThrow(() =>
    assertSecureDeployment({ MCP_API_KEY: "x".repeat(32) }, "0.0.0.0", true),
  );
});

test("native TLS configuration requires both certificate and private key", () => {
  assert.equal(loadTlsServerOptions({}), undefined);
  assert.throws(
    () => loadTlsServerOptions({ MCP_TLS_CERT_PATH: "certificate.pem" }),
    /configured together/i,
  );
});

test("mail server certificate verification can only be disabled by server-side opt-in", () => {
  const headers = {
    "x-email-provider": "imap-smtp",
    "x-email-smtp-user": "sender@163.com",
    "x-email-smtp-pass": "app-password",
    "x-email-smtp-tls-reject-unauthorized": "false",
  };
  const securePolicy = resolveEmailConfig({ env: {}, headers });
  assert.throws(() => validateEmailConfig(securePolicy, "send"), /cannot be disabled/i);

  const explicitDevelopmentOverride = resolveEmailConfig({
    env: { EMAIL_ALLOW_INVALID_TLS_CERTIFICATES: "true" },
    headers,
  });
  assert.doesNotThrow(() => validateEmailConfig(explicitDevelopmentOverride, "send"));
});

test("plaintext mail ports require STARTTLS unless the server operator opts out", () => {
  const config = resolveEmailConfig({
    env: {
      EMAIL_PROVIDER: "imap-smtp",
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_USER: "sender@example.test",
      SMTP_PASS: "app-password",
      IMAP_HOST: "imap.example.test",
      IMAP_PORT: "143",
      IMAP_SECURE: "false",
    },
  });
  const service = new EmailService(config);
  assert.equal(service.smtpTransport().options.requireTLS, true);
  assert.equal(service.imapClient().options.doSTARTTLS, true);

  const developmentConfig = resolveEmailConfig({
    env: {
      EMAIL_PROVIDER: "imap-smtp",
      SMTP_HOST: "127.0.0.1",
      SMTP_USER: "test",
      SMTP_PASS: "test",
      IMAP_HOST: "127.0.0.1",
      IMAP_PORT: "143",
      IMAP_SECURE: "false",
      EMAIL_ALLOW_INSECURE_TRANSPORT: "true",
    },
  });
  const developmentService = new EmailService(developmentConfig);
  assert.equal(Boolean(developmentService.smtpTransport().options.requireTLS), false);
  assert.equal(developmentService.imapClient().options.doSTARTTLS, false);
});
