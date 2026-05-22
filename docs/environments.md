# Environments

SocketLens environments let you switch WebSocket targets without rewriting URLs or tokens.

Use them for:

- local development,
- staging endpoints,
- production-like debugging,
- temporary tokens,
- saved connection profiles.

Environment data is local-first. SocketLens does not sync environments to a cloud service.

## Presets

SocketLens starts with three editable presets:

- `Local`
- `Staging`
- `Production`

The `Local` preset points to the included echo server:

```text
ws://127.0.0.1:17787
```

`Staging` and `Production` contain example URLs. Replace those with your real endpoints before using them.

## Variables

Variables use double braces:

```text
{{base_url}}
{{auth_token}}
```

Example connection profile:

```text
{{base_url}}?token={{auth_token}}
```

When you connect, SocketLens resolves the template with the active environment, validates the resolved URL, then opens the WebSocket connection.

Captured packet payloads are not interpolated or modified.

## Secrets

Variables can be marked as secret.

Secret variables:

- are stored locally,
- are hidden in password-style fields,
- are redacted in URL previews,
- should still be treated carefully.

SocketLens does not log secret variable values intentionally, but exported environment files include all variable values so you can move environments between machines.

## Connection Profiles

Each environment can define connection profiles. A profile is a reusable WebSocket URL template.

Example:

```text
Name: Local echo
URL:  {{base_url}}
```

In the connection modal:

1. Choose the active environment.
2. Click a profile.
3. Review the resolved preview.
4. Save or connect.

Saved connections keep environment metadata so reconnecting can resolve the latest variable values.

## Import and Export

Use Settings -> Environments to import or export environments as JSON.

Export files are useful for local backups or sharing a development setup with a teammate.

Important: exported files include secret variable values. Do not commit exported environment files if they contain real tokens.

## Local-First Behavior

Environments are stored in local app/browser storage.

SocketLens does not provide:

- cloud sync,
- hosted secret storage,
- shared team environments,
- telemetry around environment usage.

This keeps the alpha simple and predictable.
