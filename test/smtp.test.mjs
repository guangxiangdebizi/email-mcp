import assert from "node:assert/strict";
import test from "node:test";

import { SMTPServer } from "smtp-server";

import { EmailService } from "../dist/email/emailService.js";

test("send_email delivers a real SMTP message", async () => {
  let resolveMessage;
  const receivedMessage = new Promise((resolve) => {
    resolveMessage = resolve;
  });
  const smtpServer = new SMTPServer({
    disabledCommands: ["STARTTLS"],
    onAuth(auth, _session, callback) {
      callback(null, { user: auth.username });
    },
    onData(stream, _session, callback) {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => {
        resolveMessage(Buffer.concat(chunks).toString("utf8"));
        callback();
      });
    },
  });

  await new Promise((resolve, reject) => {
    smtpServer.once("error", reject);
    smtpServer.listen(0, "127.0.0.1", resolve);
  });
  const port = smtpServer.server.address().port;
  try {
    const service = new EmailService({
      provider: "imap-smtp",
      defaultFrom: "sender@example.test",
      allowInsecureTransport: true,
      allowInvalidTlsCertificates: false,
      smtp: {
        host: "127.0.0.1",
        port,
        secure: false,
        user: "sender@example.test",
        pass: "test-password",
        tlsRejectUnauthorized: true,
      },
    });
    const result = await service.send({
      to: "recipient@example.test",
      subject: "SMTP integration test",
      body: "Provider-neutral delivery works.",
    });
    const raw = await receivedMessage;

    assert.equal(result.ok, true);
    assert.equal(result.provider, "imap-smtp");
    assert.match(raw, /To: recipient@example\.test/i);
    assert.match(raw, /Subject: SMTP integration test/i);
    assert.match(raw, /Provider-neutral delivery works\./i);
  } finally {
    await new Promise((resolve) => smtpServer.close(resolve));
  }
});
