import assert from "node:assert/strict";
import test from "node:test";

import { resolveEmailConfig, validateEmailConfig } from "../dist/config.js";

test("163 SMTP credentials also configure inferred IMAP access", () => {
  const config = resolveEmailConfig({
    env: {
      EMAIL_PROVIDER: "smtp",
      SMTP_USER: "reader@163.com",
      SMTP_PASS: "app-password",
    },
  });

  assert.equal(config.provider, "imap-smtp");
  assert.deepEqual(
    {
      smtp: [config.smtp?.host, config.smtp?.port, config.smtp?.secure],
      imap: [config.imap?.host, config.imap?.port, config.imap?.secure],
    },
    {
      smtp: ["smtp.163.com", 465, true],
      imap: ["imap.163.com", 993, true],
    },
  );
  assert.equal(config.imap?.user, "reader@163.com");
  assert.equal(config.imap?.pass, "app-password");
  assert.doesNotThrow(() => validateEmailConfig(config, "read"));
});

test("tool account overrides request account", () => {
  const env = {
    EMAIL_DEFAULT_ACCOUNT: "personal",
    SMTP_HOST: "smtp.must-not-leak.example",
    SMTP_USER: "flat@example.com",
    SMTP_PASS: "flat-password",
    IMAP_HOST: "imap.must-not-leak.example",
    EMAIL_ACCOUNTS_JSON: JSON.stringify({
      personal: {
        provider: "imap-smtp",
        from: "personal@qq.com",
        smtp: { user: "personal@qq.com", pass: "p1" },
      },
      work: {
        provider: "imap-smtp",
        from: "work@outlook.com",
        smtp: { user: "work@outlook.com", pass: "p2" },
      },
    }),
  };

  const config = resolveEmailConfig({
    env,
    headers: { "x-email-account": "personal" },
    account: "work",
  });
  assert.equal(config.account, "work");
  assert.equal(config.smtp?.host, "smtp.office365.com");
  assert.equal(config.imap?.host, "outlook.office365.com");
  assert.equal(config.defaultFrom, "work@outlook.com");
  assert.equal(config.smtp?.pass, "p2");
  assert.equal(config.imap?.pass, "p2");
});

test("individual request headers override environment configuration", () => {
  const config = resolveEmailConfig({
    env: {
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.env.test",
      SMTP_USER: "env@test.example",
      SMTP_PASS: "env-pass",
      IMAP_HOST: "imap.env.test",
    },
    headers: {
      "X-Email-From": "header@test.example",
      "X-Email-SMTP-Host": "smtp.header.test",
      "X-Email-SMTP-Port": "465",
      "X-Email-SMTP-Secure": "true",
      "X-Email-SMTP-User": "header@test.example",
      "X-Email-SMTP-Pass": "header-pass",
      "X-Email-IMAP-Host": "imap.header.test",
      "X-Email-IMAP-Port": "993",
      "X-Email-IMAP-Secure": "true",
    },
  });

  assert.equal(config.defaultFrom, "header@test.example");
  assert.equal(config.smtp?.host, "smtp.header.test");
  assert.equal(config.smtp?.port, 465);
  assert.equal(config.smtp?.secure, true);
  assert.equal(config.imap?.host, "imap.header.test");
  assert.equal(config.imap?.user, "header@test.example");
  assert.equal(config.imap?.pass, "header-pass");
});

test("X-Email-Config accepts base64url JSON", () => {
  const value = Buffer.from(
    JSON.stringify({
      provider: "imap-smtp",
      from: "base64@example.test",
      smtp: { host: "smtp.example.test", port: 465, secure: true, user: "u", pass: "p" },
      imap: { host: "imap.example.test", port: 993, secure: true, user: "u", pass: "p" },
    }),
  ).toString("base64url");
  const config = resolveEmailConfig({
    env: {},
    headers: { "x-email-config": `base64:${value}` },
  });
  assert.equal(config.defaultFrom, "base64@example.test");
  assert.equal(config.smtp?.host, "smtp.example.test");
  assert.equal(config.imap?.host, "imap.example.test");
});
