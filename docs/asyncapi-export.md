# Experimental AsyncAPI Draft Export

SocketLens can export an experimental AsyncAPI-like YAML draft from captured packets.

This is an alpha foundation for documentation workflows. It is not a validated AsyncAPI contract, and it should not be treated as proof of a production API shape.

## What It Does

The exporter looks at the selected session and infers:

- event names from decoded packet summaries,
- packet direction as `receive` or `send`,
- one sanitized example payload per inferred event,
- a shallow payload schema from the example,
- packet counts per inferred event,
- endpoint metadata with URL credentials and query strings redacted.

Every inferred section is marked with:

```yaml
x-socketlens-inferred: true
```

The generated file also starts with comments explaining that it is experimental and needs manual review.

## How To Export

1. Capture packets in Demo Mode, Direct Mode, or Proxy Mode.
2. Open **Session Files** in the left sidebar.
3. Keep redaction enabled unless you intentionally need a raw local export.
4. Click **AsyncAPI draft**.
5. Save the `.experimental-asyncapi.yaml` file.
6. Review and edit the draft before sharing or committing it.

Browser development mode downloads the YAML file. Desktop/Tauri mode opens a native save dialog.

## Privacy

AsyncAPI draft export uses the same session redaction flow as JSON session export.

By default, SocketLens generates the draft from a redacted copy and does not mutate the active in-app session. Redaction targets common sensitive values such as tokens, cookies, authorization headers, API keys, password-like fields, endpoint credentials, endpoint query strings, and custom rules entered in the Session Files panel.

Always review the exported YAML before sharing it. Example payloads can still contain application-specific data that SocketLens cannot classify automatically.

## What It Does Not Guarantee

The exporter does not infer with certainty:

- canonical channel names,
- required fields,
- full JSON Schema constraints,
- authentication or security schemes,
- all possible payload variants,
- protocol-specific semantics beyond current decoders,
- production stability of the API.

If multiple payload shapes share the same event name, the exporter keeps a small example and marks the schema as inferred. Use the draft as a starting point for documentation, not as a source of truth.

## Example Output Shape

```yaml
# Experimental SocketLens AsyncAPI draft
# This file is inferred from captured WebSocket traffic.
# Review, edit, and validate it before using it as an API contract.
# Fields marked with x-socketlens-inferred are guesses, not guarantees.
asyncapi: "3.0.0"
info:
  title: "Local echo realtime events"
  version: "0.1.0-experimental"
  x-socketlens-inferred: true
channels:
  chat_message_created-inbound:
    address: "chat.message.created"
    x-socketlens-direction: "inbound"
    x-socketlens-inferred: true
operations:
  receive-chat_message_created:
    action: "receive"
    x-socketlens-inferred: true
components:
  messages:
    chat_message_created:
      contentType: "application/json"
      x-socketlens-inferred: true
```

## Roadmap

Future improvements may add stronger schema inference, better protocol-specific grouping, fixture-backed validation, and optional export adapters for stricter AsyncAPI tooling. For now, the feature is intentionally labeled experimental.
