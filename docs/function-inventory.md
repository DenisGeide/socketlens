# SocketLens Function Inventory

This document describes the features and functions that exist in the current SocketLens repository. It is not a roadmap. It does not describe planned work as implemented work. When a capability is demo-only, experimental, or only an architectural foundation, it is marked explicitly.

## 1. Product Summary

SocketLens is a local-first WebSocket debugging workspace for developers building realtime applications. It helps developers connect to WebSocket endpoints, inspect inbound and outbound frames, review payloads, manually send messages, replay outbound messages, save sessions, and demonstrate realistic realtime traffic without a production backend.

Current project status: `v1.0.0-alpha`.

Main modes:

- **Demo Mode**: simulated offline traffic for first-run onboarding, screenshots, and investor demos. This is not real production traffic.
- **Direct Mode**: SocketLens opens a WebSocket connection itself through the browser/WebView WebSocket API.
- **Proxy Mode**: the Tauri desktop backend starts a local Rust WebSocket proxy so an external client can connect through SocketLens.

Stable alpha foundation:

- desktop/web workspace layout;
- investor demo and continuous demo packet stream;
- Direct Mode for regular `ws://` and `wss://` endpoints;
- packet timeline, packet selection, inspector, search, filters, grouping;
- manual send and replay for an active Direct Mode connection;
- session JSON save/export/import;
- redaction before export;
- settings, i18n, diagnostics, command palette;
- source-level extension contracts for decoders, filters, exporters, AI providers, and replay.

Experimental or foundation-level areas:

- Proxy Mode is a working MVP, but it requires the Tauri desktop backend and has alpha limitations.
- AsyncAPI draft export is experimental and based on inferred packet flows.
- Socket.IO and GraphQL over WebSocket support are initial decoders, not complete protocol debugging suites.
- MessagePack/BSON support is documented as a future/foundation strategy, not implemented as complete decoding.
- The plugin registry is a local source-level foundation, not a marketplace and not runtime remote plugin execution.
- AI is optional, disabled by default, provider-dependent, and only sends data after an explicit user action.

## 2. UI Feature Inventory

### Top Bar

| Element | What it does | Enabled/disabled behavior | Related state/service | User-facing behavior |
|---|---|---|---|---|
| App logo/status | Shows SocketLens, connection status, and current endpoint | Always visible | `connection-store`, `ui-store` | Status changes between idle, connecting, connected, disconnected, error, and demo |
| Frame counter | Shows current packet count | Always visible | `packet-store`, selected session | Updates when packets arrive or are cleared |
| GitHub Star CTA | Opens the SocketLens GitHub repository | Always available | `open-external-url` | Opens the repository in an external browser |
| Clear | Opens packet clear confirmation | Disabled when there are no packets | `packet-store`, `App.tsx` confirmation dialog | Clears captured frames only after confirmation |
| Command Palette | Opens the action palette | Available in desktop layout; the button is hidden on narrower widths | `command-palette.tsx`, `App.tsx` command list | Also opens with `Ctrl+K` / `Cmd+K` |
| Settings | Toggles the settings workspace | Always available | `ui-store` | Opens or closes the Settings page |
| Reset Demo | Resets investor demo progress | Visible when investor demo is active | `demo/investor-demo.ts`, `ui-store` | Returns the guided demo to its initial state |
| Start/Stop Investor Demo | Starts or stops guided demo traffic | Start is disabled during active connection/busy states; Stop is available during demo | `investor-demo.ts`, `packet-store`, `session-store`, `ui-store` | Creates or stops a simulated demo session |
| Connect/Disconnect | Opens Direct Mode connection flow or closes the active connection | Connect is disabled while connecting or when demo is active; Disconnect is shown for an active connection | `connection-store` | Opens a WebSocket connection or safely closes it |

### Sidebar / Connections

The sidebar is the main navigation and control area. It is intentionally compact and uses cards plus collapsible sections so secondary tools do not compete with the packet timeline.

#### Connection Manager

- Shows the Connection Manager heading and a **New** button.
- **New** opens the new direct WebSocket connection modal.
- The modal accepts a connection name and WebSocket URL.
- URLs are validated as `ws://` or `wss://`.
- Connections can be saved in local recent connections when the privacy setting allows it.

#### Quick Start and onboarding cards

Implemented onboarding/demo cards:

- Quick Start panel for first launch;
- Investor Demo card;
- Demo Packet Stream card.

Behavior:

- each card can be closed with a subtle `X` button;
- only the selected card is hidden;
- dismissed card state is saved locally;
- **Restart onboarding** in Settings restores all onboarding cards and resets progress;
- onboarding does not delete sessions, packets, files, or connection settings.

#### Capture mode cards

The sidebar explains the two ways SocketLens can receive packets:

- **Direct connection**: SocketLens connects to a WebSocket server itself.
- **Proxy mode**: an external application connects to a local SocketLens proxy URL.

This UI switch changes the working context. It does not make Proxy Mode available in browser-only development mode without the Tauri backend.

#### Quick Connect: Echo Server

- Shows the command `npm run dev:echo`.
- Shows the local URL `ws://127.0.0.1:17787`.
- **Connect echo** quickly creates or opens a direct connection to the local echo server.
- **Save endpoint** saves the endpoint to recent connections.

#### Active Direct Connection

When a direct connection is active, the sidebar shows:

- connection name;
- endpoint URL;
- connected/disconnected badge;
- number of packets captured in the current session;
- actions for disconnect/reconnect.

#### Saved WS endpoints

- Collapsible list of saved WebSocket endpoints.
- Shows last connected time and connection status.
- Lets the user select an endpoint and reconnect.

#### Collapsible sidebar sections

Implemented collapsible sections:

- Diagnostics;
- Memory;
- Bookmarks / annotated packets;
- Manual Send;
- Session Files;
- Sessions.

### Demo Mode

Demo Mode has two separate pieces: the guided investor demo and the continuous demo packet stream.

#### Investor Demo

- Guided scenario for first-run understanding and screenshots.
- Creates a simulated session with a `demo://...` endpoint.
- Adds realistic synthetic packets to the timeline.
- Shows packet highlights and walkthrough cards.
- Can show a demo AI explanation without calling a real AI provider when AI is disabled.

Generated traffic includes:

- auth challenge and accepted session events;
- chat sent/created events;
- presence/cursor updates;
- notifications;
- heartbeat ping/pong;
- reconnect/resume events;
- warning/error path examples;
- streaming AI-like response examples;
- replay example markers.

Limitations:

- traffic is fully simulated;
- demo traffic does not prove that a production endpoint works;
- demo packets must not be presented as customer or production data.

#### Demo Packet Stream

- Continuous synthetic stream used to test the timeline, filters, inspector, and screenshots.
- Start/Stop controls manage the generator.
- Packets appear live in the timeline.
- Useful for visual and stress checks, but it is not a substitute for direct/proxy testing.

### Packet Timeline

The packet timeline is the main workspace of the application.

Implemented features:

- virtualized packet list for large sessions;
- inbound and outbound frame rows;
- direction rail and icon;
- event name display;
- payload preview;
- timestamp;
- packet size;
- protocol badge when a decoder identifies the protocol;
- badges for error, demo, replay, replay source, related packet, bookmark, suspicious flag, and tags;
- selected packet state;
- hover state;
- grouping for repeated events and flows;
- empty state with practical next steps;
- paused/following visual state.

#### Packet selection

- Manual packet selection switches selection mode to `manual`.
- New packets do not overwrite a manually selected older packet.
- Scroll follow/latest behavior is separate from the selected packet.
- **Go to latest** moves the timeline back to the newest packet.
- When new packets arrive while the user is inspecting an older packet, the UI can show a new-packets indicator.

#### Search and filters

Timeline controls include:

- debounced search across payload, event name, and direction;
- text and regex search modes;
- direction filters: all, incoming, outgoing;
- JSON-only filter;
- errors-only filter;
- hide ping/pong;
- hide heartbeat;
- smart filter query;
- filter presets and favorites;
- clear filters;
- result counters.

Invalid regex or smart filter input is handled safely. The UI shows a validation issue and avoids crashing.

#### Grouping

Packet grouping supports:

- repeated events;
- heartbeat storms;
- reconnect/auth related sequences;
- expandable groups;
- grouping on/off toggle.

Grouping does not delete or permanently hide original packets. Users can expand a group and inspect the original frames.

#### Clear packets confirmation

- Clear does not delete packets immediately.
- A confirmation dialog explains what will be cleared.
- Confirm clears captured frames.
- Cancel leaves the timeline untouched.
- When there are zero packets, the action is disabled or safely treated as a no-op.

### Payload Inspector

The payload inspector is the right-side panel for the selected packet.

#### Empty state

When no packet is selected:

- the inspector shows a clear empty state;
- Pretty/Raw/Metadata views do not show fake data;
- the AI panel remains in disabled/provider state and does not send anything.

#### Header and metadata summary

For a selected packet, the inspector shows:

- event name;
- direction;
- size;
- timestamp;
- incoming/outgoing badge;
- copy action.

#### Pretty JSON view

- Formats payload if it is valid JSON.
- Handles invalid JSON safely.
- Uses scroll containers for large payloads and long lines.
- Does not translate or alter payload content.

#### Raw view

- Shows the original payload text.
- Does not format or transform user traffic.

#### Metadata view

Shows:

- event name;
- direction;
- timestamp;
- size;
- payload kind;
- connection ID;
- session ID;
- packet ID.

#### Expanded Payload Viewer modal

- **Open large view** opens a centered modal.
- The modal supports Pretty and Raw payload views.
- It includes copy and close actions.
- It supports vertical and horizontal scrolling.
- It shows packet metadata below the payload.
- It preserves the selected packet state.

#### Packet relationships

When packet relationship logic finds related packets:

- the inspector can show related packets;
- inferred relationships are labeled as inferred;
- raw packet access remains available.

### Manual Send

Manual Send is located in the sidebar.

Implemented features:

- payload examples: ping, auth, chat;
- JSON/raw input mode;
- JSON formatting;
- payload textarea;
- send frame action;
- disabled states when there is no active WebSocket connection;
- composer validation error display.

Connection requirements:

- sending works only with an active open WebSocket;
- buttons stay disabled in disconnected or browser fallback states;
- SocketLens never sends payloads without an explicit user action.

### Replay

Replay is part of the Manual Send panel and Direct Mode connection flow.

Implemented replay behavior:

- replay selected outgoing packet;
- edit payload before replay;
- replay edited payload;
- replay last outgoing packet;
- replay a selected sequence from recent outgoing packets;
- delay controls between replayed frames;
- replay count controls;
- replay history;
- replay status: idle, running, success, error;
- disabled state when there is no active connection;
- replay source marker in packet data/history.

Limitations:

- real replay requires an active Direct Mode WebSocket connection;
- demo packets may show replay examples, but they are not real sends to a server;
- replay does not automatically restore a closed connection.

### Sessions

Session Files is available in the sidebar.

Implemented features:

- session name field;
- save current session JSON;
- export packets JSON;
- import/upload previous session JSON;
- packet count;
- created date/status display;
- native Tauri file APIs in desktop mode;
- browser download/upload fallback in browser development mode.

Formats:

- `socketlens.session` for full session files;
- `socketlens.packets` for packet export files.

#### Redaction

Before save/export, the panel includes a redaction layer:

- redaction warning;
- redaction enabled/disabled toggle;
- redaction preview;
- replacement statistics;
- custom redaction rules;
- unsafe export confirmation when redaction is disabled and sensitive data is detected.

Important behavior:

- redaction is applied to the save/export copy;
- the active live session is not mutated automatically;
- payload structure is preserved where possible.

#### AsyncAPI draft

An experimental AsyncAPI-like export exists:

- generates an inferred YAML draft;
- emits inferred channels, operations, and messages;
- labels inferred fields;
- intended as a starting point, not a guaranteed contract.

### Environments

Environments are managed from the Settings page.

Implemented features:

- Local/Staging/Production presets;
- environment name and description;
- variables;
- secret variables;
- interpolation syntax such as `{{base_url}}` and `{{auth_token}}`;
- connection profiles;
- add variable/profile;
- create new environment;
- duplicate environment;
- delete environment;
- import/export environment JSON;
- active environment switching.

Behavior:

- values are stored locally;
- secret values are hidden in UI previews;
- exported environment files include variable values, including secrets, so the UI warns the user;
- captured packets are not rewritten when the active environment changes.

### Diagnostics

Diagnostics is available in the sidebar.

Displayed fields:

- app version;
- platform;
- Tauri backend status;
- connection status;
- active environment;
- socket ready state;
- redacted endpoint;
- proxy status;
- packet counters;
- memory/retention limit;
- AI provider status;
- session ID;
- reconnect state;
- last close/error when present.

Actions:

- Copy diagnostics;
- Export diagnostics JSON.

Privacy behavior:

- the diagnostics bundle excludes packet payloads;
- it excludes environment variable values;
- it excludes provider secrets;
- it excludes raw recent log messages;
- endpoint values are redacted before being included in the bundle.

### Settings

Settings uses a single vertical desktop settings flow.

#### Language

- Russian is the default language.
- English is available as the second language.
- Switching happens instantly without reload.
- UI strings use i18n keys.
- Payloads, JSON, raw messages, URLs, traffic logs, and session files are not translated.

#### Appearance

- Theme: dark, light, system.
- Compact mode.
- Auto-scroll by default.

#### Workspace

- Packet retention limit.
- Presets: 10k, 25k, 50k.
- Custom numeric input.
- Retention limits memory usage and removes older packets when the limit is reached.

#### Environments

- The built-in environment manager is described above.

#### AI Provider

- Disabled by default.
- OpenAI-compatible provider.
- Ollama provider.
- Provider validation.
- Ollama model loading.

#### Privacy

- Local-first capture explanation.
- Persist recent connections toggle.
- Show timeline payload previews toggle.

#### Settings actions

- Restart onboarding.
- Reset settings.

### Command Palette

The command palette is implemented in `components/command-palette.tsx`.

Shortcuts:

- `Ctrl+K` / `Cmd+K`;
- `Ctrl+Shift+P` / `Cmd+Shift+P`.

Available action categories include:

- start demo;
- open settings;
- open diagnostics;
- connect;
- disconnect;
- reconnect;
- switch environment;
- switch session;
- bookmark selected packet;
- replay selected packet;
- clear timeline;
- export session;
- reset filters;
- toggle incoming/outgoing/json/errors/hide ping-pong filters.

Behavior:

- search matches title, description, group, and keywords;
- disabled actions show a reason;
- Enter runs the selected action;
- Escape closes the palette;
- arrow keys change the selected action.

### AI Panel / AI Features

AI in SocketLens is optional and disabled by default.

AI panel actions:

- explain selected packet;
- explain selected sequence;
- summarize session;
- explain auth/reconnect flow.

Provider states:

- Disabled;
- OpenAI-compatible;
- Ollama;
- validation error;
- provider unavailable/network error;
- loading;
- markdown result.

Privacy behavior:

- AI does not send data automatically;
- data is sent only after an explicit AI action click;
- the UI shows privacy and uncertainty notes;
- investor demo can show an offline demo explanation without calling a configured provider.

Limitations:

- AI output is a debugging aid, not the source of truth;
- provider credentials are stored locally;
- answer quality depends on the selected provider/model;
- SocketLens explicitly avoids certainty when the payload is ambiguous.

### Bookmarks / Notes / Tags

The inspector supports packet annotations:

- bookmark packet;
- suspicious flag;
- tags;
- local note.

The sidebar has a Bookmarks/annotated packets section:

- lists packets with annotations;
- lets the user select an annotated packet;
- shows tag and note previews;
- caps the visible list so the sidebar does not grow without bound.

Persistence/export behavior:

- annotations are part of packet data;
- session export/import preserves annotations;
- redaction can apply to annotations during export when relevant rules match.

### Logs

The bottom logs panel:

- shows application events such as connect/disconnect, received/sent frames, demo events, proxy events, and errors;
- supports clearing logs;
- can collapse/expand;
- shows a status strip in collapsed mode;
- is not a raw traffic payload archive.

## 3. Core Logic Inventory

### Packet Model

File: `apps/desktop/src/models/packet.ts`.

Main packet fields:

- `id`: unique packet ID;
- `connectionId`: associated connection;
- `sessionId`: associated session;
- `direction`: `inbound` or `outbound`;
- `timestamp`: Unix timestamp in milliseconds;
- `payload`: original payload string;
- `payloadKind`: `json`, `text`, or `binary`;
- `sizeBytes`: payload size in bytes;
- `sendSource`: `manual` or `replay` when created by an outgoing send;
- `sourcePacketId`: source packet for replay;
- `annotations`: bookmark, note, suspicious flag, and tags.

`createPacket`:

- infers `payloadKind`;
- calculates byte size;
- creates timestamp/id;
- does not translate or modify payload content.

### Connection System

File: `apps/desktop/src/store/connection-store.ts`.

Direct Mode uses the browser/WebView WebSocket API.

State owned by the store:

- `status`;
- `socket`;
- `endpointUrl`;
- `connections`;
- `activeConnectionId`;
- `selectedConnectionId`;
- `activeSessionId`;
- `isConnected`;
- `error/errorDetails`;
- reconnect metadata.

Lifecycle:

1. Validate URL.
2. Interpolate active environment variables if the URL contains `{{...}}`.
3. Create or update a connection entry.
4. Open WebSocket.
5. On `open`, create a session and set connected state.
6. On `message`, create an inbound packet.
7. On manual send, create an outbound packet.
8. On `close`, close the session and set disconnected state.
9. On `error`, create a friendly error, log entry, and toast.

Supported URL schemes:

- `ws://`;
- `wss://`.

### Proxy System

Proxy Mode requires the desktop/Tauri backend.

Frontend files:

- `apps/desktop/src/components/proxy-mode-panel.tsx`;
- `apps/desktop/src/lib/tauri-commands.ts`;
- `apps/desktop/src/lib/proxy-events.ts`.

Rust backend files:

- `apps/desktop/src-tauri/src/proxy.rs`;
- `apps/desktop/src-tauri/src/commands.rs`;
- `apps/desktop/src-tauri/src/app_state.rs`;
- `apps/desktop/src-tauri/src/session.rs`;
- `apps/desktop/src-tauri/src/errors.rs`.

Behavior:

- the user enters a target WebSocket URL;
- the Rust backend starts a local proxy on `127.0.0.1` with an available port;
- the UI displays the local proxy URL;
- an external client connects to that local proxy URL;
- the proxy connects to the target URL;
- client-to-target and target-to-client frames are forwarded;
- text, binary, ping, pong, close, and error events are emitted to the frontend;
- captured frames appear in the timeline.

Limitations:

- browser development mode cannot open the native proxy port;
- advanced auth/header rewriting is not in the current scope;
- Proxy Mode is an alpha MVP, not an enterprise gateway;
- it is intended for local debugging.

### Demo Packet Generator

Files:

- `apps/desktop/src/demo/demo-stream.ts`;
- `apps/desktop/src/demo/investor-demo.ts`.

Synthetic packets:

- are generated locally;
- are marked as demo/simulated;
- are written into packet/session stores;
- let users test timeline, inspector, filters, grouping, and screenshots without a real server.

Start/stop/reset behavior:

- start creates a demo session or flow;
- stop ends the running generator;
- reset clears demo walkthrough/progress state.

### Store / State Management

SocketLens uses Zustand stores.

#### connection-store

File: `apps/desktop/src/store/connection-store.ts`.

Owns:

- direct WebSocket lifecycle;
- connection history;
- active session ID;
- send message;
- reconnect/disconnect;
- URL validation/interpolation;
- connection errors.

Persistence:

- recent connections are saved locally when the privacy setting allows it.

#### packet-store

File: `apps/desktop/src/store/packet-store.ts`.

Owns:

- packet list;
- batched add packet/add packets;
- clear packets;
- annotation updates;
- retention trimming.

Persistence:

- packets live in memory until the user saves/exports a session.

#### session-store

File: `apps/desktop/src/store/session-store.ts`.

Owns:

- sessions;
- start/update/import/remove/rename;
- packet counters;
- bytes in/out;
- session status.

Persistence:

- runtime state is in memory;
- durable storage is through session save/export/import.

#### settings-store

File: `apps/desktop/src/store/settings-store.ts`.

Owns:

- theme, language, compact mode;
- auto-scroll default;
- packet/log retention;
- AI provider settings;
- privacy settings;
- onboarding state;
- filter presets, grouping, and log panel collapsed settings.

Persistence:

- local settings storage.

#### ui-store

File: `apps/desktop/src/store/ui-store.ts`.

Owns:

- selected packet/session;
- packet selection mode;
- filters;
- demo state;
- logs;
- toasts;
- composer draft/mode/error;
- replay history/status.

Persistence:

- mostly runtime-only; persistent preferences belong in the settings store.

#### environment-store

File: `apps/desktop/src/store/environment-store.ts`.

Owns:

- Local/Staging/Production environments;
- active environment;
- variables;
- secrets;
- profiles;
- import/export.

Persistence:

- localStorage key `socketlens.environments.v1`.

### Persistence

Local persistence includes:

- settings;
- onboarding progress and dismissed cards;
- recent connections;
- environments;
- log panel/filter/grouping preferences;
- session files only after explicit save/export.

Session file behavior:

- files are versioned JSON;
- import remaps IDs and normalizes session status;
- corrupted imports produce user-facing errors;
- browser mode uses download/upload fallback.

### Filtering Engine

File: `apps/desktop/src/extensions/filter-engine.ts`.

Implemented filtering:

- text search;
- regex search;
- direction filters;
- payload kind filter;
- errors only;
- hide heartbeat;
- hide ping/pong;
- event query;
- min/max size;
- JSON-path-like smart conditions with `==` and `!=`.

Supported smart query examples:

```text
payload.type != "heartbeat"
payload.event == "chat.message"
payload.user.id == "123"
```

Performance behavior:

- parsed JSON payload cache uses `WeakMap`;
- inactive filters return the original packet array;
- invalid compiled filters return safe empty results.

### Decoder System

File: `apps/desktop/src/extensions/packet-decoder.ts`.

Implemented:

- `DecoderRegistry`;
- decoder priority;
- safe fallback;
- decoded summary for timeline/inspector;
- default decoders:
  - Socket.IO decoder;
  - GraphQL WS decoder;
  - JSON decoder;
  - raw binary decoder;
  - fallback decoder.

#### JSON Decoder

- Parses JSON payload.
- Produces an event name from `type`, `event`, `action`, or fallback `json.frame`.

#### Socket.IO Decoder

- Initial support.
- Detects Engine.IO/Socket.IO frame prefixes.
- Extracts packet type, namespace, ack ID, event name, and preview.
- Unknown frames gracefully fall back to raw view.

#### GraphQL WS Decoder

- Initial support.
- Detects common GraphQL over WebSocket message shapes.
- Shows operation name/kind when available.
- Labels connection init/ack, subscribe/start, next/data, error, complete, ping, and pong messages.

#### Binary Decoder Foundation

- Raw binary fallback exists.
- MessagePack/BSON stubs exist only as documented future/foundation strategy.
- Full Protobuf, MessagePack, and BSON decoding is not implemented.

### Replay Logic

Files:

- `apps/desktop/src/extensions/replay-strategy.ts`;
- `apps/desktop/src/components/manual-send-panel.tsx`;
- `apps/desktop/src/store/connection-store.ts`.

Validation:

- replay requires an active WebSocket connection;
- replay requires a selected outgoing packet or source payload;
- replay requires an active session.

Payload behavior:

- replay can use the original payload;
- replay can use an edited payload override;
- replay creates history items and outbound packets with `sendSource: "replay"`.

Timing:

- delay controls apply between frames during sequence replay.

### Redaction Logic

File: `apps/desktop/src/models/session-redaction.ts`.

Default redaction covers:

- authorization headers;
- cookies and set-cookie;
- API keys;
- access/refresh/id/auth tokens;
- password/secret/jwt-like fields;
- bearer tokens;
- token query parameters;
- URLs with credentials or secret-looking query values.

Custom rules:

- one rule per line;
- literal text or `/regex/flags`;
- invalid custom rules are shown in preview/error state.

Export-only behavior:

- the original live session is not changed automatically;
- redaction applies to the save/export copy.

### Diagnostics Logic

File: `apps/desktop/src/lib/diagnostics-bundle.ts`.

Collected data:

- app metadata;
- runtime/platform/backend state;
- active mode/environment;
- connection/proxy state;
- packet counters;
- retention info;
- AI provider state;
- session/reconnect/last error metadata.

Excluded data:

- packet payloads;
- environment variable values;
- provider secrets;
- raw log messages.

### AI Provider Logic

Files:

- `apps/desktop/src/lib/ai/*`;
- `apps/desktop/src/extensions/ai-provider.ts`;
- `apps/desktop/src/components/ai-analysis-panel.tsx`.

Providers:

- disabled;
- OpenAI-compatible;
- Ollama;
- mock provider for tests/demo.

Actions:

- explain selected packet;
- explain sequence;
- summarize session;
- explain auth/reconnect flow;
- prompt foundation also includes event flow detection.

Prompt behavior:

- returns compact Markdown;
- asks the model to identify purpose, event type, suspicious errors, and payload summary;
- requires uncertainty;
- tells the model not to invent behavior, endpoints, or credentials.

Error handling:

- provider validation;
- network/provider parse errors;
- user-facing errors and toasts;
- disabled/not configured state.

### Tauri Bridge

Files:

- `apps/desktop/src/lib/tauri-commands.ts`;
- `apps/desktop/src/lib/proxy-events.ts`;
- `apps/desktop/src/lib/tauri-runtime.ts`.

Frontend native calls use safe wrappers:

- `healthCheck`;
- `getBackendStatus`;
- `getProxyStatus`;
- `startProxy`;
- `stopProxy`.

Behavior:

- wrappers return `{ ok: true, data }` or `{ ok: false, error }`;
- browser dev mode returns `tauri_unavailable`;
- event listeners register only in Tauri runtime;
- cleanup prevents duplicate proxy listeners.

### Rust Backend

Files:

- `apps/desktop/src-tauri/src/app_state.rs`;
- `apps/desktop/src-tauri/src/commands.rs`;
- `apps/desktop/src-tauri/src/errors.rs`;
- `apps/desktop/src-tauri/src/proxy.rs`;
- `apps/desktop/src-tauri/src/session.rs`;
- `apps/desktop/src-tauri/src/lib.rs`;
- `apps/desktop/src-tauri/src/main.rs`.

Responsibilities:

- Tauri command registration;
- app state with proxy manager and session registry;
- local WebSocket proxy;
- proxy events to frontend;
- typed command errors;
- file/dialog/opener plugins.

User errors are handled through typed errors rather than panics.

## 4. File/Module Map

| File/folder | Responsibility | Related feature | Contributor notes |
|---|---|---|---|
| `apps/desktop/src/App.tsx` | Main UI composition and action wiring | App shell, commands, clear confirmation, session actions | Avoid adding new domain logic here |
| `apps/desktop/src/main.tsx` | React bootstrap | App startup, i18n init | Entry point for web/Tauri UI |
| `apps/desktop/src/index.css` | Global theme, density, typography | Visual system | Changes affect the whole UI |
| `apps/desktop/src/components/` | React UI components | Sidebar, timeline, inspector, settings | Feature UI belongs here or in a feature-specific subfolder |
| `apps/desktop/src/components/layout/app-shell.tsx` | Desktop panel layout | Sidebar, workspace, inspector, logs | Core workspace structure |
| `apps/desktop/src/components/ui/` | Reusable UI primitives | Button, input, badge, panel, textarea | Keep business logic out |
| `apps/desktop/src/config/app-metadata.ts` | Version/name/repository metadata | Diagnostics, top bar, docs | Keep in sync with package/Cargo versions |
| `apps/desktop/src/config/runtime-defaults.ts` | Local echo constants | Quick connect | Used by onboarding and Direct Mode |
| `apps/desktop/src/demo/` | Synthetic demo flows | Investor demo, demo stream | Demo-only; do not mix with direct/proxy logic |
| `apps/desktop/src/dev/` | Development payload helpers | Manual send examples | Sample/helper data only |
| `apps/desktop/src/extensions/types.ts` | Extension contracts | Decoders, filters, exporters, AI, replay | Main contract layer |
| `apps/desktop/src/extensions/packet-decoder.ts` | Decoder registry and default decoders | JSON, Socket.IO, GraphQL WS, fallback | Add protocol decoders through this contract |
| `apps/desktop/src/extensions/packet-analyzer.ts` | Packet classification | Badges and semantic analysis | Keep fast and deterministic |
| `apps/desktop/src/extensions/filter-engine.ts` | Default filter implementation | Timeline search/filter | Do not mutate packets |
| `apps/desktop/src/extensions/export-adapter.ts` | Export adapter foundation | Session/packet JSON export | Add new export formats here |
| `apps/desktop/src/extensions/ai-provider.ts` | AI provider contract | AI integrations | AI must stay optional |
| `apps/desktop/src/extensions/replay-strategy.ts` | Replay validation and preparation | Replay | Prepares payload/history; does not own UI |
| `apps/desktop/src/extensions/plugin-registry.ts` | Local source-level plugin registry | Contributor extension foundation | Not remote plugin execution |
| `apps/desktop/src/i18n/` | i18next setup and locales | Russian/English UI | Do not translate payloads or raw traffic |
| `apps/desktop/src/lib/ai/` | AI providers, prompts, validation | AI panel and settings | No hardcoded API keys |
| `apps/desktop/src/lib/tauri-commands.ts` | Safe invoke wrappers | Proxy/backend status | Browser fallback is required |
| `apps/desktop/src/lib/proxy-events.ts` | Tauri event listeners | Proxy packet capture | Cleanup prevents duplicate listeners |
| `apps/desktop/src/lib/session-file-storage.ts` | Native/browser file IO | Save/load/export/import | Called through App-level callbacks |
| `apps/desktop/src/lib/diagnostics-bundle.ts` | Diagnostics serialization | Diagnostics copy/export | Sensitive data excluded |
| `apps/desktop/src/lib/asyncapi-export.ts` | Experimental AsyncAPI draft | Session export | Mark as experimental |
| `apps/desktop/src/lib/packet-grouping.ts` | Packet grouping | Timeline grouping | Preserve original packet order |
| `apps/desktop/src/lib/packet-relationships.ts` | Relationship inference | Inspector/timeline hints | Avoid false certainty |
| `apps/desktop/src/lib/flow-analysis.ts` | Flow detection | Flow summary | Keep understandable |
| `apps/desktop/src/lib/json-payload.ts` | JSON parsing helpers | Inspector/send/tests | Safe invalid JSON handling |
| `apps/desktop/src/lib/user-facing-errors.ts` | Friendly error model | Errors and toasts | Avoid raw stack traces in UI |
| `apps/desktop/src/models/` | Domain types and helpers | Packets, sessions, settings, filters, environments | Keep pure and testable |
| `apps/desktop/src/store/connection-store.ts` | Direct WebSocket lifecycle | Direct Mode | Owns socket side effects |
| `apps/desktop/src/store/packet-store.ts` | Packet list, batching, retention | Timeline/session stats | Performance-sensitive |
| `apps/desktop/src/store/session-store.ts` | Sessions and stats | Session list/files | No file IO here |
| `apps/desktop/src/store/settings-store.ts` | Persisted settings/onboarding | Settings, i18n, privacy | Keep migrations compatible |
| `apps/desktop/src/store/ui-store.ts` | Runtime UI state | Selection, logs, toasts, filters, replay | Avoid long-term persistence here |
| `apps/desktop/src/store/environment-store.ts` | Environments and profiles | Variables/interpolation | Local-first; do not log secrets |
| `apps/desktop/src-tauri/src/app_state.rs` | Shared native state | Proxy/session registry | Rust backend state container |
| `apps/desktop/src-tauri/src/commands.rs` | Tauri commands | Health, backend, proxy | Typed command boundary |
| `apps/desktop/src-tauri/src/errors.rs` | Backend command errors | Proxy/user errors | User errors must not panic |
| `apps/desktop/src-tauri/src/proxy.rs` | Rust WebSocket proxy | Proxy Mode | Async forwarding/capture |
| `apps/desktop/src-tauri/src/session.rs` | Native proxy sessions | Proxy counters/events | Keeps proxy IDs and stats |
| `apps/desktop/src-tauri/src/lib.rs` | Tauri builder/plugin setup | Desktop app | Registers commands, plugins, state |
| `apps/desktop/src-tauri/src/main.rs` | Native entrypoint | Desktop startup | Thin wrapper |
| `examples/echo-server/` | Node/ws echo server | Direct Mode QA | Run with `npm run dev:echo` |
| `examples/socketio-demo/` | Socket.IO demo server | Socket.IO decoder QA | Run with `npm run dev:socketio` |
| `examples/chat-demo/` | Browser chat example | Demo/manual QA | Workspace example |
| `apps/landing/` | Landing package | Public site | Separate from desktop app |
| `docs/` | Project documentation | Onboarding, contribution, release | Keep commands aligned with package scripts |
| `docs/assets/` | Branding, screenshots, release assets | README/GitHub presentation | Screenshots should show real app states |
| `launchers/` | One-click launch scripts | Windows/macOS/Linux launch UX | Use real npm scripts only |
| `scripts/` | Repository maintenance scripts | clean, lint, encoding, release prep | Root npm scripts call these |

## 5. User Workflows

### First run

Steps:

1. Run `npm install`.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:1420/`.
4. Read the Quick Start panel in the sidebar.
5. Start Investor Demo or connect the echo server.

Expected result:

- the app opens in browser dev mode;
- the sidebar explains Demo, Direct, and Proxy modes;
- native proxy features are unavailable until desktop/Tauri mode is used.

Common failure:

- port `1420` is already in use.

Fix:

- close the existing Vite process/window or stop the terminal that started it.

### Demo mode

Steps:

1. Click **Start Investor Demo**.
2. Watch packets appear in the timeline.
3. Select a highlighted packet.
4. Open Pretty/Raw/Metadata in the inspector.
5. Reset demo if needed.

Expected result:

- synthetic packets appear;
- inspector shows payload and metadata;
- demo traffic is clearly labeled as simulated/demo.

Common failure:

- Start button is disabled because an active WebSocket connection exists.

Fix:

- disconnect first.

### Direct echo-server connection

Steps:

1. Run `npm run dev:echo` in a second terminal.
2. In SocketLens, click **Connect echo** or create a connection to `ws://127.0.0.1:17787`.
3. Wait for connected status.
4. Watch welcome/periodic packets.

Expected result:

- connection status becomes connected;
- inbound packets appear in the timeline;
- logs record received frames.

Common failure:

- connection refused.

Fix:

- verify that `npm run dev:echo` is running and port `17787` is free.

### Manual send

Steps:

1. Connect to the echo server.
2. Open Manual Send.
3. Choose `Ping` or enter `{"command":"ping"}`.
4. Click send.

Expected result:

- an outbound packet appears;
- the echo server returns an inbound response;
- the sent frame is added to replay history.

Common failure:

- send button is disabled.

Fix:

- connect first.

### Replay selected packet

Steps:

1. Send an outgoing packet.
2. Select the outgoing packet in the timeline or choose it from previous outgoing frames.
3. Optionally edit the payload.
4. Click replay/replay edited.

Expected result:

- a new outbound replay packet appears;
- source marker/history item is recorded;
- the echo server response appears if the server is running.

Common failure:

- replay is blocked because there is no connection.

Fix:

- reconnect the Direct Mode endpoint.

### Inspect payload

Steps:

1. Select any packet.
2. Use Pretty/Raw/Metadata tabs.
3. Click copy or large view.

Expected result:

- Pretty formats JSON;
- Raw preserves original text;
- Metadata shows IDs, timestamp, and size;
- large modal supports horizontal scroll for long JSON lines.

Common failure:

- invalid JSON cannot be formatted.

Fix:

- use Raw view; the payload is still available.

### Export sanitized session

Steps:

1. Capture or demo some packets.
2. Open Session Files.
3. Keep redaction enabled.
4. Review the preview.
5. Save/export.

Expected result:

- JSON file downloads or saves;
- sensitive tokens, cookies, and auth-like values are redacted in the exported copy.

Common failure:

- custom regex is invalid.

Fix:

- correct or remove the custom rule.

### Use environments

Steps:

1. Open Settings.
2. Open Environments.
3. Choose Local/Staging/Production.
4. Edit `base_url` or profiles.
5. Use a profile URL such as `{{base_url}}`.

Expected result:

- variables interpolate before connection;
- secret values are hidden in UI preview.

Common failure:

- unresolved variable.

Fix:

- add the missing variable or remove the `{{...}}` token.

### Copy diagnostics

Steps:

1. Open Diagnostics in the sidebar.
2. Click Copy diagnostics or Export.

Expected result:

- JSON bundle contains app/runtime/status/counters;
- payloads and secrets are excluded.

Common failure:

- clipboard is blocked by the browser.

Fix:

- use Export diagnostics instead.

### Use command palette

Steps:

1. Press `Ctrl+K` / `Cmd+K`.
2. Type an action name.
3. Press Enter.

Expected result:

- enabled action runs;
- disabled action shows a reason.

Common failure:

- action is disabled because connection/session/packet is missing.

Fix:

- follow the disabled reason, for example connect first or select a packet.

## 6. Contributor Extension Guide Summary

Where to add new work:

- New UI feature: `apps/desktop/src/components/`, with state in an existing store only when needed.
- New protocol decoder: implement `PacketDecoder` in `apps/desktop/src/extensions/packet-decoder.ts` or a dedicated extension file, then register it through `defaultPacketDecoders` or a local plugin.
- New filter: implement `FilterEngine` or extend `models/filter-state.ts` plus `extensions/filter-engine.ts`.
- New AI provider: implement `AIProvider` in `apps/desktop/src/lib/ai/providers/` and expose settings/validation explicitly.
- New exporter: implement `ExportAdapter` in `apps/desktop/src/extensions/export-adapter.ts`.
- New replay behavior: implement `ReplayStrategy` without coupling it to UI.
- New Rust/native capability: add a typed command in `src-tauri/src/commands.rs`, typed error in `errors.rs`, and a safe frontend wrapper in `lib/tauri-commands.ts`.

What not to touch unless necessary:

- Do not put protocol parsing in React components.
- Do not mutate packet payloads in filters/decoders.
- Do not send AI data automatically.
- Do not add remote plugin execution.
- Do not mix demo generation with production proxy/direct logic.
- Do not bypass redaction for share/export flows.
- Do not rely on browser-only APIs for desktop-only proxy behavior without fallback.

How to add a new decoder without touching core UI:

1. Implement the `PacketDecoder` contract.
2. Give it a stable `id`, `label`, and priority.
3. Make `canDecode` fast and safe.
4. Return decoded event name, protocol, and metadata from `decode`.
5. Add tests with known payloads and fallback cases.
6. Register the decoder in the decoder list or a local plugin.
7. The timeline and inspector will consume decoded summaries through existing helpers.

## 7. Alpha Limitations

Current limitations:

- SocketLens is `v1.0.0-alpha`, not stable commercial software.
- Desktop builds are unsigned.
- Proxy Mode requires the Tauri desktop runtime; browser dev mode cannot accept external proxy clients.
- Proxy Mode is a local debugging MVP, not an enterprise proxy/gateway.
- Advanced proxy features such as header rewriting/auth rewriting are not implemented.
- Socket.IO support is initial decoding, not a full Socket.IO debugging suite.
- GraphQL WS support is initial message-shape detection, not a full GraphQL inspector.
- AsyncAPI export is an experimental inferred draft.
- MessagePack/BSON/Protobuf are not implemented as real decoders yet.
- Plugin architecture is source-level only; there is no plugin marketplace or runtime remote execution.
- AI is optional, disabled by default, and may be wrong.
- There is no telemetry by default.
- Captured packets stay in memory unless the user saves/exports a session.
- Large sessions depend on packet retention settings and local machine resources.

## 8. Verification Checklist

Use real root package scripts only.

Setup:

- [ ] Run `npm install`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check` before release freeze.

App startup:

- [ ] Run `npm run dev`.
- [ ] App opens at `http://127.0.0.1:1420/`.
- [ ] Quick Start/onboarding appears on a clean profile.

Demo:

- [ ] Click Start Investor Demo.
- [ ] Demo packets appear.
- [ ] Select a packet and inspect Pretty/Raw/Metadata.
- [ ] Demo reset works.

Direct Mode:

- [ ] Run `npm run dev:echo`.
- [ ] Connect to `ws://127.0.0.1:17787`.
- [ ] Packets appear in timeline.
- [ ] Manual send `{"command":"ping"}` works.
- [ ] Echo response appears.

Selection/latest behavior:

- [ ] Select an older packet.
- [ ] Let new packets arrive.
- [ ] Selected packet does not auto-jump.
- [ ] New packet indicator appears.
- [ ] Go to latest moves back to the newest packet.

Timeline:

- [ ] Search/filter works.
- [ ] Invalid regex/smart filter does not crash the UI.
- [ ] Grouping on/off works.
- [ ] Clear opens confirmation.
- [ ] Confirm clears packets; cancel keeps packets.

Inspector:

- [ ] Copy payload works.
- [ ] Large payload view opens.
- [ ] Large view copy/close works.
- [ ] Long JSON lines scroll horizontally.

Sessions:

- [ ] Save/export session works.
- [ ] Import/upload session works.
- [ ] Redaction preview works.
- [ ] Unsafe export warning appears when redaction is disabled and sensitive data is detected.
- [ ] Experimental AsyncAPI draft export is labeled as experimental.

Environments:

- [ ] Switch Local/Staging/Production.
- [ ] `{{base_url}}` interpolates.
- [ ] Secret values are hidden.
- [ ] Import/export environment file works.

Diagnostics:

- [ ] Copy diagnostics works.
- [ ] Export diagnostics works.
- [ ] Bundle excludes payloads/secrets.

Command Palette:

- [ ] `Ctrl+K` / `Cmd+K` opens the palette.
- [ ] Enabled action runs.
- [ ] Disabled action explains why.

Settings/i18n:

- [ ] Russian UI works.
- [ ] English UI works.
- [ ] Language persists after reload.
- [ ] Packet payload/raw messages are not translated.
- [ ] Settings persist after reload.

AI:

- [ ] Disabled state is clear.
- [ ] Provider not configured state is clear.
- [ ] Demo explanation does not call an external provider.
- [ ] Real AI action sends data only after click.

Proxy Mode:

- [ ] Run desktop mode with `npm run dev:desktop`.
- [ ] Start echo-server with `npm run dev:echo`.
- [ ] Start proxy to `ws://127.0.0.1:17787`.
- [ ] External client connects to the local proxy URL.
- [ ] Proxy packets appear in the timeline.
- [ ] Stop proxy cleans up state.
