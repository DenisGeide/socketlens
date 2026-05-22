---
name: Bug report
about: Report a reproducible problem in SocketLens
title: "[Bug]: "
labels:
  - "type: bug"
  - "status: needs-triage"
assignees: ""
---

## What happened?

Describe the problem clearly. Include what you were trying to do and what SocketLens did instead.

## Before filing

- [ ] I checked that this is not already listed as an alpha limitation in the README or release notes.
- [ ] I removed secrets, tokens, private URLs, customer data, and sensitive packet payloads.

## Steps to reproduce

1.
2.
3.

## Fast isolation checklist

- [ ] I tried Investor Demo Mode, if the issue affects app startup or the packet UI.
- [ ] I tried the local echo server with `npm run dev:echo`, if the issue affects Direct Mode.
- [ ] I noted whether this happens in browser mode, desktop mode, or both.
- [ ] I ran `npm run check`, if this is a local development or pull-request issue.

## Expected behavior

What should have happened?

## Actual behavior

What happened instead?

## Screenshots or recording

Attach screenshots or a short recording for UI issues.

## Environment

- OS:
- SocketLens version or commit:
- Install source: source clone / downloaded artifact / fork
- Node version:
- npm version:
- Rust/Cargo version, if using desktop/proxy mode (Rust `1.77.2` or newer is required):
- Running mode: `npm run dev` or `npm run dev:desktop`

## Capture mode

- [ ] Investor Demo Mode
- [ ] Demo mode
- [ ] Direct Mode
- [ ] Proxy Mode
- [ ] Session import/export
- [ ] AI
- [ ] Other

## Logs and diagnostics

Paste relevant SocketLens log panel messages, terminal output, or diagnostics panel details. Remove secrets, tokens, customer data, and private payloads before posting.

```text

```

## Additional context

Anything else that might help reproduce or understand the issue.
