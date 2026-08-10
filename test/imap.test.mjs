import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";

import { SMTPServer } from "smtp-server";

import { EmailService } from "../dist/email/emailService.js";

const RAW_MESSAGE = [
  "From: Alice <alice@example.com>",
  "To: Bob <bob@example.com>",
  "Subject: Provider-neutral IMAP message",
  "Date: Mon, 10 Aug 2026 00:00:00 +0000",
  "Message-ID: <mock@example.com>",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hello from mock IMAP.",
  "",
].join("\r\n");

const ENVELOPE =
  '("Mon, 10 Aug 2026 00:00:00 +0000" "Provider-neutral IMAP message" ' +
  '(("Alice" NIL "alice" "example.com")) (("Alice" NIL "alice" "example.com")) ' +
  '(("Alice" NIL "alice" "example.com")) (("Bob" NIL "bob" "example.com")) ' +
  'NIL NIL NIL "<mock@example.com>")';

function createMockImapServer(commands) {
  return net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] mock ready\r\n");
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (!line) continue;
        commands.push(line);
        const [tag, command, ...rest] = line.split(" ");
        const upperCommand = command?.toUpperCase();
        const subcommand = rest[0]?.toUpperCase();

        if (upperCommand === "AUTHENTICATE" || upperCommand === "LOGIN") {
          socket.write(`${tag} OK authenticated\r\n`);
        } else if (upperCommand === "CAPABILITY") {
          socket.write(`* CAPABILITY IMAP4rev1 AUTH=PLAIN\r\n${tag} OK capability\r\n`);
        } else if (upperCommand === "LIST") {
          socket.write(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n${tag} OK list\r\n`);
        } else if (upperCommand === "SELECT" || upperCommand === "EXAMINE") {
          socket.write(
            "* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\r\n" +
              "* 1 EXISTS\r\n" +
              "* OK [UIDVALIDITY 1]\r\n" +
              "* OK [UIDNEXT 2]\r\n" +
              `${tag} OK [READ-WRITE] selected\r\n`,
          );
        } else if (upperCommand === "UID" && subcommand === "SEARCH") {
          socket.write(`* SEARCH 1\r\n${tag} OK search\r\n`);
        } else if (upperCommand === "UID" && subcommand === "FETCH") {
          socket.write(
            `* 1 FETCH (UID 1 FLAGS () INTERNALDATE "10-Aug-2026 00:00:00 +0000" ` +
              `ENVELOPE ${ENVELOPE} BODY[]<0> {${Buffer.byteLength(RAW_MESSAGE)}}\r\n` +
              `${RAW_MESSAGE})\r\n${tag} OK fetch\r\n`,
          );
        } else if (upperCommand === "LOGOUT") {
          socket.end(`* BYE closing\r\n${tag} OK logout\r\n`);
        } else {
          socket.write(`${tag} OK\r\n`);
        }
      }
    });
  });
}

test("all mailbox operations work with standard IMAP and SMTP", async () => {
  const commands = [];
  const imapServer = createMockImapServer(commands);
  let resolveReply;
  const receivedReply = new Promise((resolve) => {
    resolveReply = resolve;
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
        resolveReply(Buffer.concat(chunks).toString("utf8"));
        callback();
      });
    },
  });
  await new Promise((resolve, reject) => {
    imapServer.once("error", reject);
    imapServer.listen(0, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => {
    smtpServer.once("error", reject);
    smtpServer.listen(0, "127.0.0.1", resolve);
  });
  const imapPort = imapServer.address().port;
  const smtpPort = smtpServer.server.address().port;
  try {
    const service = new EmailService({
      account: "mock-163",
      provider: "imap-smtp",
      defaultFrom: "bob@example.com",
      imap: {
        host: "127.0.0.1",
        port: imapPort,
        secure: false,
        user: "bob@example.com",
        pass: "test-password",
        tlsRejectUnauthorized: true,
      },
      smtp: {
        host: "127.0.0.1",
        port: smtpPort,
        secure: false,
        user: "bob@example.com",
        pass: "test-password",
        tlsRejectUnauthorized: true,
      },
    });
    const messages = await service.read({ limit: 1, folder: "INBOX", unreadOnly: false });

    assert.equal(messages.length, 1);
    assert.equal(messages[0].subject, "Provider-neutral IMAP message");
    assert.equal(messages[0].body, "Hello from mock IMAP.");
    assert.equal(messages[0].isUnread, true);
    assert.equal(messages[0].internetMessageId, "<mock@example.com>");
    assert.match(messages[0].messageId, /^imap:/);

    const searched = await service.search({
      query: "from:alice@example.com is:unread",
      limit: 1,
      folder: "INBOX",
    });
    assert.equal(searched.length, 1);
    assert(commands.some((command) => /UID SEARCH .*FROM alice@example\.com.*UNSEEN/i.test(command)));

    const deleted = await service.delete(messages[0].messageId);
    assert.equal(deleted.deleted, true);
    assert(commands.some((command) => /UID STORE 1 .*\\Deleted/i.test(command)));

    const replied = await service.reply({
      messageId: messages[0].messageId,
      body: "Reply through generic SMTP.",
      replyAll: false,
      html: false,
    });
    const rawReply = await receivedReply;
    assert.equal(replied.ok, true);
    assert.match(rawReply, /To: Alice <alice@example\.com>/i);
    assert.match(rawReply, /Subject: Re: Provider-neutral IMAP message/i);
    assert.match(rawReply, /In-Reply-To: <mock@example\.com>/i);
  } finally {
    imapServer.closeAllConnections?.();
    await new Promise((resolve) => imapServer.close(resolve));
    await new Promise((resolve) => smtpServer.close(resolve));
  }
});
