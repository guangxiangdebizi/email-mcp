import assert from "node:assert/strict";
import test from "node:test";

import { buildImapSearchQuery } from "../dist/email/imapQuery.js";
import {
  decodeMessageLocator,
  encodeGmailMessageLocator,
  encodeImapMessageLocator,
  getMessageLocatorAccount,
} from "../dist/email/messageLocator.js";

test("opaque IMAP locators preserve folder, UID, and account", () => {
  const value = encodeImapMessageLocator("Archive/2026", 42, "work");
  assert.deepEqual(decodeMessageLocator(value, "imap"), {
    provider: "imap",
    folder: "Archive/2026",
    uid: 42,
    account: "work",
  });
  assert.equal(getMessageLocatorAccount(value), "work");
});

test("opaque Gmail locators preserve API ID and account", () => {
  const value = encodeGmailMessageLocator("18abc", "gmail");
  assert.deepEqual(decodeMessageLocator(value, "gmail"), {
    provider: "gmail",
    id: "18abc",
    account: "gmail",
  });
});

test("IMAP search parser supports portable filters and quoted values", () => {
  const query = buildImapSearchQuery(
    'from:alice@example.com subject:"quarterly report" since:2026-01-01 is:unread urgent',
  );
  assert.equal(query.from, "alice@example.com");
  assert.equal(query.subject, "quarterly report");
  assert.equal(query.seen, false);
  assert.equal(query.text, "urgent");
  assert.equal(query.since?.toISOString(), "2026-01-01T00:00:00.000Z");
});
