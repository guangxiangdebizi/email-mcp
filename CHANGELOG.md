# Changelog

## 2.1.0 - 2026-08-24

### Security

- Added native HTTPS with TLS 1.2+ and optional mutual TLS.
- Changed the default listener from `0.0.0.0` to `127.0.0.1`.
- Refuse plaintext HTTP, missing authentication, and weak API keys on network listeners unless explicitly overridden.
- Require STARTTLS for non-direct-TLS SMTP and IMAP connections.
- Prevent request headers from disabling mail-server certificate validation without a server-side opt-in.
- Added no-store, HSTS, MIME-sniffing, framing, referrer, and content-security response headers.
- Overrode the vulnerable transitive `html-to-text` release with its patched version; `npm audit` reports zero vulnerabilities.

## 2.0.0 - 2026-08-10

### Added

- Native MCP Streamable HTTP endpoint at `/mcp`.
- Provider-neutral IMAP support for reading, searching, and deleting messages.
- Provider-neutral SMTP support for sending and replying to messages.
- Named multi-account configuration with per-tool account selection.
- Per-request `X-Email-*` connection headers and `X-Email-Config` JSON.
- Automatic server presets for QQ, 163/126/yeah.net, Gmail, Outlook, Yahoo, and iCloud.
- Opaque message locators that preserve account and folder context.
- MCP API-key authentication, CORS configuration, and a health endpoint.
- Integration tests for all five tools and the Streamable HTTP protocol.

### Changed

- `read_emails`, `search_emails`, `delete_email`, and `reply_email` no longer require Gmail API credentials when using a standard mailbox.
- The default transport changed from stdio/SSE gateway to native stateless Streamable HTTP.
- Dependencies were updated to patched releases; `npm audit` reports zero vulnerabilities.

### Security

- `.env` and `node_modules` are no longer tracked or published.
- Optional `MCP_API_KEY` authentication is available for network deployments.
