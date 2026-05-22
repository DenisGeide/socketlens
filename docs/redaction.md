# Redaction

Purpose: explain how SocketLens helps users export sessions without leaking common secrets.

Redaction is an export-time safety layer. It does not automatically mutate the live session unless the user explicitly changes data elsewhere.

## What Redaction Covers

Default redaction rules target common sensitive values:

- authorization headers;
- cookies and `Set-Cookie`;
- API keys;
- access tokens;
- refresh tokens;
- ID/auth tokens;
- password-like fields;
- secret-like fields;
- bearer tokens;
- token query parameters;
- URLs with credentials or secret-looking query values.

## Custom Rules

Custom redaction rules support:

- literal text;
- JavaScript-style regular expressions such as `/session_[a-z0-9]+/i`.

One rule goes on each line.

Invalid custom rules are shown in the redaction preview and block safe export while redaction is enabled.

## Preview

The preview shows:

- how many packets were redacted;
- how many replacements were made;
- a sample redacted payload when available.

Users should still review shared files manually. Redaction is a safety tool, not a legal guarantee.

## Unsafe Export

If redaction is disabled and SocketLens detects sensitive-looking data, export requires an explicit confirmation.

## Related

- [Sessions](sessions.md)
- [Privacy](privacy.md)
- [Security Model](security-model.md)
- [Manual QA](manual-qa.md)

## Next Steps

Learn the session file format in [Sessions](sessions.md).

