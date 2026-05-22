# Security Model

This document describes the current SocketLens security and privacy model for contributors, maintainers, and users evaluating the project.

## Design Goals

- Keep packet captures local by default.
- Avoid hidden network calls and hidden data collection.
- Keep AI optional, disabled by default, and explicitly user-triggered.
- Avoid hardcoded credentials, tokens, and realistic secret fixtures.
- Treat session files and captured payloads as sensitive local data.
- Keep native backend permissions narrow and understandable.
- Make security-sensitive behavior visible in docs and UI.

## Trust Boundaries

SocketLens has these main boundaries:

- **Frontend app**: React UI, Zustand stores, local settings, packet timeline, inspector, replay, and session import/export.
- **Native Tauri backend**: local commands, proxy manager, session registry, file-dialog-backed filesystem access.
- **Direct WebSocket endpoint**: the server URL a user chooses in Direct Mode.
- **Proxy target endpoint**: the target WebSocket server a user chooses in Proxy Mode.
- **External proxy client**: another local app or tool that connects to SocketLens' local proxy URL.
- **AI provider**: an optional user-configured OpenAI-compatible or Ollama endpoint.
- **Local filesystem and clipboard**: user-selected session files and explicit copy actions.

Data should not cross these boundaries without a visible user action or a documented mode-specific reason.

## Default Data Flow

Fresh app start:

- no telemetry is sent
- no AI provider is contacted
- no WebSocket endpoint is contacted
- no session file is read
- demo traffic is synthetic and local

Captured packets remain in memory unless the user saves, exports, copies, sends, replays, proxies, or analyzes them with a configured AI provider.

## Direct Mode

Direct Mode opens a WebSocket connection from SocketLens to the user-provided `ws://` or `wss://` URL.

SocketLens captures:

- outbound frames sent from the app
- inbound frames received from the endpoint
- frame metadata such as direction, timestamp, size, and event summary

Operational logs record connection status and frame sizes, not full payload bodies.

## Proxy Mode

Proxy Mode starts a native local listener on `127.0.0.1` with an ephemeral port. External clients connect to that local proxy URL, and SocketLens forwards traffic to the configured target WebSocket URL.

SocketLens captures forwarded frames in both directions. Proxy traffic leaves the machine only according to the target URL the user configured.

Current security expectations:

- listener binds to localhost
- target URL must be `ws://` or `wss://`
- text frames are captured as text or JSON
- binary frames are represented with a bounded hex preview
- close frames are handled without payload capture

## AI Analysis

AI is disabled by default. The app works fully without AI.

AI data transfer happens only after all of these are true:

- the user configures a provider
- the provider configuration passes local validation
- the user selects an AI action
- the user clicks the action, such as **Explain**

For **Explain selected packet**, SocketLens sends selected packet metadata and a bounded payload excerpt to the configured provider. It does not stream live captures or send packets automatically.

Provider keys are not hardcoded. User-entered provider settings are stored locally.

## Local Files

Session save/load is explicit:

- native desktop mode uses Tauri dialogs for user-selected paths
- browser development mode uses browser download/upload behavior
- imports are parsed as JSON and validated before state mutation
- session and packet exports can be redacted before writing
- redaction is enabled for exported copies by default where the export UI supports it
- disabling redaction for sensitive-looking data requires explicit confirmation
- redaction does not mutate the active in-app session

Session files may contain full payloads, endpoint URLs, timestamps, session names, and close reasons. Treat them as sensitive.

Redaction is best-effort. Review exported files before sharing them outside your machine or organization.

## Local Storage

SocketLens uses local app storage for settings and recent connections.

Local settings may include:

- theme and UI preferences
- recent connection metadata
- AI provider configuration
- OpenAI-compatible API key if the user enters one

This storage is local to the app environment, but it is not a secret vault. Shared machines should be treated carefully.

## Logging

Logs are intended for operational debugging. They should include:

- connection lifecycle events
- proxy start/stop events
- packet counts and sizes
- import/export status
- friendly error summaries

Logs should not include:

- full packet payloads
- authorization headers
- API keys
- provider tokens
- imported file contents
- full endpoint query strings
- full local file contents

SocketLens redacts URL credentials and query strings in log and AI-prompt contexts where the full URL is not needed.

The browser error boundary may write local render failures to the developer console. This is local diagnostic output and is not transmitted by SocketLens.

## Clipboard

Payload copy is explicit. When the user copies a packet payload, SocketLens places that payload on the operating system clipboard. Other local applications may be able to read clipboard contents depending on platform behavior.

## Secrets Policy

The repository must not contain real credentials or realistic secret-looking fixtures.

Examples that must not be committed:

- production API keys
- OAuth tokens
- private keys
- customer payloads
- real session files
- demo strings using real secret prefixes such as `sk_live_`

`npm run lint` includes a high-confidence secret pattern scan. It helps catch common mistakes but does not replace code review or dedicated secret scanning.

## Tauri Permissions

The native app uses Tauri commands for backend status and proxy control, plus dialog-backed filesystem access for session import/export.

Permission changes should be reviewed carefully. Avoid broad filesystem or shell capabilities unless they are required, documented, and exposed through a clear user action.

The desktop app also defines a Tauri Content Security Policy in `apps/desktop/src-tauri/tauri.conf.json`. It allows local app assets, Tauri IPC, user-configured HTTP/HTTPS AI endpoints, and user-configured `ws://`/`wss://` WebSocket endpoints. Keep this policy reviewed when adding new network or asset-loading behavior.

## Known Limitations

- Redaction is best-effort and should be reviewed before sharing exported files.
- AI prompts include payload excerpts when the user explicitly runs an AI action.
- Provider API keys are stored locally, not in an OS keychain yet.
- Downloadable artifacts are currently unsigned until release signing is configured.

## Contributor Checklist

Before merging security-sensitive changes:

- run `npm run check`
- verify no payloads, tokens, or local file contents are logged
- verify AI actions are still explicit and disabled by default
- update [privacy.md](privacy.md) if any data flow changes
- update this document if a trust boundary or native permission changes
- avoid new dependencies that add telemetry or hidden network calls
