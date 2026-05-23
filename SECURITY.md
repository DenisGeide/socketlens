# Security Policy

SocketLens is a local-first developer tool for inspecting WebSocket traffic. Captured packets may contain credentials, customer data, private messages, production identifiers, or other sensitive material, so security and privacy issues should be handled carefully.

## Supported Versions

SocketLens has not shipped a stable release line yet. Security fixes are applied to the main development branch until versioned release support is established.

## Privacy And Data Handling Commitments

- Packets stay local by default.
- SocketLens has no telemetry, analytics, crash reporting, or hidden data collection by default.
- AI analysis is disabled by default.
- AI providers receive selected packet data only after the user clicks an AI action.
- SocketLens does not operate a hosted ingestion endpoint for captured traffic.
- API keys and provider settings must never be hardcoded in source.
- Session files are user-selected local JSON files and may contain full payload data.
- Diagnostics and copied error details are for local debugging and must not include full packet payloads, provider secrets, or imported file contents by default.

See [docs/privacy.md](docs/privacy.md) and [docs/security-model.md](docs/security-model.md).

## Reporting A Vulnerability

Do not open public issues for suspected vulnerabilities.

Use GitHub private vulnerability reporting if it is enabled for the repository. If it is not available, contact the repository owner privately through GitHub or another maintainer-published contact channel.

Include:

- a description of the issue
- reproduction steps
- potential impact
- affected platform and SocketLens version or commit
- any suggested mitigation

## What To Report

Please report:

- hidden network calls, telemetry, or data collection
- accidental transmission of packet payloads, session files, provider keys, or endpoint history
- local file handling bugs that read or write outside explicit user selection
- WebSocket proxy behavior that exposes listeners beyond localhost without clear consent
- hardcoded credentials or realistic-looking secret fixtures
- unsafe logging of packet payloads, API keys, authorization headers, or local file contents
- Tauri command or permission issues that broaden filesystem or network access unexpectedly

## Contributor Security Rules

- Do not commit real packet captures, API keys, tokens, private URLs, or customer data.
- Demo values must be clearly synthetic and must not use real provider secret prefixes such as `sk_live_`.
- Do not add telemetry or crash reporting without documentation, settings, and explicit project approval.
- Do not log full packet payloads, authorization headers, API keys, or imported file contents.
- Keep diagnostics bundles redacted: counters, status, and runtime metadata are fine; full payloads and provider secrets are not.
- Keep AI optional and user-triggered.
- Validate imported session files before loading them into app state.
- Keep native listeners bound to localhost unless a documented user-facing setting changes that behavior.

## Local Development Notes

The repository lint command includes a small high-confidence secret pattern scan. It is not a replacement for human review or a dedicated secret scanning service, but it helps catch common token prefixes before CI passes.

Run before opening a pull request:

```bash
npm run check
```
