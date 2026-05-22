# Privacy

SocketLens is designed as a local-first WebSocket debugger. By default, captured packet data stays on your machine and in the app runtime.

## Short Version

- Packets stay local by default.
- First launch does not contact a WebSocket endpoint, AI provider, telemetry service, analytics service, or SocketLens server.
- AI is disabled by default.
- AI sends selected data only after you click an AI action.
- SocketLens has no telemetry by default.
- SocketLens has no hidden data collection.
- SocketLens does not upload session files to SocketLens servers.
- API keys are not hardcoded in the app.
- Local files are read or written only after explicit user selection.

## Local Capture

SocketLens keeps captured packets in local app memory while you debug. Packet data leaves the app only when you explicitly do one of these things:

- connect to a WebSocket endpoint in Direct Mode
- run Proxy Mode and forward external client traffic to a target WebSocket server
- send or replay a packet
- save or export a session JSON file
- import a local session JSON file
- copy a payload to your clipboard
- run an AI action with a configured provider

SocketLens does not send captured packets, endpoint URLs, logs, session files, or settings to a hosted SocketLens service.

## No Telemetry

SocketLens currently has no product analytics, usage tracking, crash reporting, or hosted telemetry endpoint.

There is no hidden data collection by default. If telemetry is ever added, it must be documented, configurable, and reviewed before release.

## Hidden Network Calls

SocketLens should not make background network requests for telemetry, analytics, crash reporting, hosted sync, update checks, or packet ingestion.

The current intentional network paths are:

- a user-started Direct Mode WebSocket connection
- a user-started Proxy Mode target connection in the native app
- a user-triggered manual send or replay over an active WebSocket
- a user-clicked Ollama model-list request in Settings
- a user-clicked AI action against the configured provider
- local example apps that connect to the local echo server when the user runs them

`npm run lint` includes a small allowlist check for browser network APIs so new hidden calls are harder to add accidentally.

## Demo Traffic

Investor Demo Mode and Demo mode use synthetic traffic. They are clearly marked as demo traffic and work offline.

The AI-style explanation shown in Investor Demo Mode is a local demo response. It does not call an AI provider.

## Connection History

Recent direct connection names and URLs can persist in local app settings storage so you can reconnect quickly.

Disable **Persist recent connections** in Settings if you do not want endpoint history stored locally. Turning it off also clears the current saved connection list.

## Timeline Payload Previews

The **Show timeline payload previews** privacy setting controls whether packet payload snippets appear in timeline rows.

When disabled:

- timeline rows hide payload previews
- search and filters still work locally
- selected packet inspection still works
- saved/exported sessions still contain full packet payloads

This setting is a display privacy control, not a redaction system.

## Session Files

Session files are local JSON documents. They may contain:

- endpoint URLs
- full packet payloads
- packet bookmarks, notes, suspicious markers, and tags
- timestamps
- packet metadata
- close reasons
- session names

SocketLens validates imported session JSON before loading it into app state.

Before saving or exporting, SocketLens shows a warning and redaction preview. Redaction is enabled by default for the exported copy and targets common sensitive values:

- tokens
- cookies
- authorization headers
- API keys and password-like fields
- endpoint URL credentials and query strings
- custom rules that you enter manually

Redaction preserves payload structure where possible and does not mutate the active in-app session. User-entered packet notes and tags are exported with sessions; custom redaction rules also apply to those notes and tags. If you disable redaction and SocketLens detects sensitive-looking data, the UI asks for explicit confirmation before writing a raw copy. Always review exported files before sharing them.

In the native Tauri app, file reads and writes happen after the user selects a path through the file dialog. In browser development mode, exports use browser downloads and imports use user-selected file uploads.

## AI Analysis

AI analysis is disabled by default.

When disabled:

- no packet data is sent to an AI provider
- no provider endpoint is contacted
- SocketLens remains fully usable

When enabled, AI actions are explicit. SocketLens sends data only after you click a specific AI action.

Current AI actions can send bounded excerpts for:

- the selected packet
- a small packet sequence around the selected packet
- a session summary context
- auth/reconnect-related packet context

SocketLens does not automatically analyze live traffic or stream captures to AI providers.

AI responses are treated as debugging hints, not facts. The UI reminds users that AI may be wrong and that raw packet data is the source of truth.

The internal mock provider used by tests and offline demo fixtures does not contact a network provider.

Do not enable AI for captures containing secrets, personal data, customer content, regulated data, production credentials, or private tokens unless your configured provider is approved for that data.

## Provider Settings

SocketLens supports:

- OpenAI-compatible chat completions endpoints
- Ollama chat endpoints

API keys are never hardcoded. If you enter an API key, it is stored locally in app settings storage. Treat local app storage as sensitive on shared machines.

Ollama is often local, but SocketLens sends data to whatever Ollama URL you configure.

## Logs And Diagnostics

SocketLens logs operational events such as connection status, packet counts, frame sizes, proxy status, session import/export status, and friendly errors.

Application logs should not include full packet payloads, authorization headers, API keys, imported file contents, provider secrets, or full endpoint query strings. If you open a bug report, remove secrets, endpoint tokens, customer data, and private payloads from screenshots or copied logs.

SocketLens redacts URL credentials and query strings in log and AI-prompt contexts where the full URL is not needed.

## Clipboard

Copying payloads is explicit. If you click **Copy payload**, the selected packet payload is placed on your system clipboard. Clipboard contents may be visible to other local applications depending on your operating system.

## More Details

See [security-model.md](security-model.md) for trust boundaries, data flows, local file handling, and contributor security rules.
