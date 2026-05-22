# Diagnostics

Purpose: explain the diagnostics panel and the privacy-safe diagnostics bundle.

Diagnostics help users and contributors troubleshoot without sharing packet payloads.

## What The Panel Shows

The diagnostics panel can show:

- app version;
- platform;
- Tauri backend state;
- active mode;
- active environment;
- connection status;
- socket ready state;
- redacted endpoint;
- proxy status;
- packet counters;
- memory/packet retention;
- AI provider status;
- session ID;
- reconnect state;
- last close/error details when present.

## Copy Diagnostics

The copy action writes a JSON diagnostics bundle to the clipboard.

If clipboard access is blocked by the browser, use export instead.

## Export Diagnostics

Export downloads a JSON file that can be attached to an issue.

## Privacy Behavior

Diagnostics are intentionally limited.

Excluded by default:

- packet payloads;
- environment variable values;
- provider API keys;
- raw recent log messages.

Endpoint URLs are redacted before being included.

## Related

- [Troubleshooting](troubleshooting.md)
- [Privacy](privacy.md)
- [Security Model](security-model.md)
- [Manual QA](manual-qa.md)

## Next Steps

When reporting a bug, include diagnostics plus the manual steps from [Troubleshooting](troubleshooting.md).

