# Architecture

SocketLens is a monorepo-style desktop application with a React frontend, a Tauri/Rust native shell, and local examples.

The architecture goal is simple: every feature should be runnable, typed, and separated by responsibility. Demo paths must stay clearly separate from production capture paths.

## Repository Map

```text
apps/desktop
  src
    components       React UI and workspace panels
    components/ui    Shared shadcn-style primitives
    config           Stable runtime defaults used across UI, stores, and models
    demo             Demo and investor-demo packet generators
    dev              Explicit development helpers
    extensions       Contributor-facing extension contracts and built-in adapters
    lib              Runtime helpers, AI, Tauri wrappers, storage
    models           Typed domain model and file schemas
    store            Zustand stores
  src-tauri
    src              Rust commands, proxy, session registry, app state
examples/echo-server Node.js WebSocket echo server
examples/chat-demo   Browser chat example
docs                 Project documentation
```

## Core Concepts

SocketLens models WebSocket debugging around five core ideas:

- **Connection**: an endpoint known to the app, including URL, display name, transport, status, and last error.
- **Session**: one connection/proxy lifecycle with timestamps, close metadata, packet counts, and byte totals.
- **Packet**: one captured inbound or outbound frame with payload, size, direction, payload kind, session id, and connection id.
- **AppLog**: a timestamped lifecycle/debug message shown in the bottom log panel.
- **AppSettings**: persisted local preferences for theme, defaults, retention, privacy, and optional AI provider configuration.

The TypeScript model layer lives in `apps/desktop/src/models`. Components should import types from `@/models` instead of inventing local packet or session shapes.

## Boundaries

SocketLens keeps feature code separated by responsibility. New work should fit one of these layers before changing core flows.

| Layer | Location | Owns | Should not own |
| --- | --- | --- | --- |
| UI components | `apps/desktop/src/components` | Rendering, user interaction, layout, local component state. | WebSocket lifecycle, file schemas, proxy command details. |
| Feature modules | `apps/desktop/src/demo`, `apps/desktop/src/extensions`, focused component panels | Demo orchestration, extension contracts, bounded feature workflows. | Global store shape unless the domain model changes. |
| Domain logic | `apps/desktop/src/models` | `Connection`, `Packet`, `Session`, settings, replay history, session file schemas. | Browser/Tauri APIs or React rendering. |
| Stores | `apps/desktop/src/store` | Runtime state, batching, persistence calls, lifecycle coordination. | Presentation-only formatting. |
| Services/helpers | `apps/desktop/src/lib` | Tauri bridge, storage, AI runtime calls, formatting, safe parsing, user-facing errors. | React components. |
| Tauri bridge | `apps/desktop/src/lib/tauri-commands.ts`, `apps/desktop/src/lib/proxy-events.ts` | Typed frontend boundary to native commands/events. | Native proxy implementation details beyond typed DTOs. |
| Rust backend | `apps/desktop/src-tauri/src` | Native command handlers, proxy runtime, backend state, user-safe errors. | React/Zustand state. |
| Protocol decoders | `apps/desktop/src/extensions/packet-decoder.ts` | Turning packet payloads into event names, previews, tags, and decoded data. | UI rendering or store mutation. |
| Filters | `apps/desktop/src/extensions/filter-engine.ts` | Fast packet matching and search text. | Mutating packets or sessions. |
| Exporters | `apps/desktop/src/extensions/export-adapter.ts` | Export adapter contract and built-in SocketLens JSON adapters. | Native save dialogs. |
| AI providers | `apps/desktop/src/extensions/ai-provider.ts`, `apps/desktop/src/lib/ai` | Provider contracts, provider registry, validation, prompts, network calls. | Required app functionality. |

## Frontend Stores

Zustand stores live in `apps/desktop/src/store`.

| Store | Responsibility |
| --- | --- |
| `useConnectionStore` | Direct WebSocket lifecycle, saved direct connections, active connection/session ids, send/replay integration. |
| `usePacketStore` | Packet collection, packet batching, retention limit enforcement, clearing packets. |
| `useSessionStore` | Session creation, session status updates, aggregate packet/byte counters, importing/removing sessions. |
| `useUiStore` | Selected packet/session, filters, logs, toasts, composer draft, demo state, replay history. |
| `useSettingsStore` | Persisted app settings through local storage. |

Runtime objects such as `WebSocket` stay inside the relevant runtime store and are not serialized.

## Direct Mode Flow

Direct Mode is frontend-owned and uses the WebView/browser `WebSocket` API.

1. The user creates or selects a direct connection.
2. `useConnectionStore.connect()` validates the URL.
3. The store creates or reuses a `Connection`.
4. `useSessionStore.startSession()` creates a `Session`.
5. WebSocket events create typed `Packet` records through `createPacket()`.
6. Packets are inserted into `usePacketStore`.
7. Session counters update through `useSessionStore.recordPacket()`.
8. UI selection, replay history, logs, and toasts update through `useUiStore`.

Direct Mode does not depend on the Rust proxy backend.

## Proxy Mode Flow

Proxy Mode is native-owned and requires the Tauri app.

1. The user enters a target WebSocket URL.
2. The frontend calls `startProxy()` through `apps/desktop/src/lib/tauri-commands.ts`.
3. Rust starts a local `127.0.0.1` listener and returns a generated local proxy URL.
4. An external client connects to the local proxy URL.
5. Rust connects to the target server and forwards traffic both directions.
6. Rust emits Tauri events for sessions, packets, close events, and logs.
7. The frontend registers those events through `registerProxyEventListeners()`.
8. Captured proxy frames enter the same `Packet`, `Session`, and timeline stores as direct traffic.

Proxy events:

- `socketlens://proxy-session-started`
- `socketlens://proxy-packet`
- `socketlens://proxy-session-closed`
- `socketlens://proxy-log`

## Rust Backend

The native backend lives in `apps/desktop/src-tauri/src`.

| Module | Responsibility |
| --- | --- |
| `lib.rs` | Builds the Tauri app, registers plugins, manages shared state, wires commands. |
| `commands.rs` | Typed Tauri commands for health, backend status, and proxy control. |
| `app_state.rs` | Shared native state for proxy and session registries. |
| `errors.rs` | User-safe command errors with stable error codes. |
| `proxy.rs` | Async WebSocket proxy listener, target connection, forwarding, event emission. |
| `session.rs` | Native proxy session registry snapshots. |

The frontend never calls Tauri `invoke` directly from components. It goes through `tauri-commands.ts`, which returns typed `NativeCommandResult` objects and handles browser-only mode gracefully.

## Packet Timeline Performance

SocketLens is designed for high packet volume.

- Packet inserts are batched in `usePacketStore`.
- Session aggregate updates are batched in `useSessionStore`.
- Auto-selection of latest packets is batched in `useUiStore`.
- `PacketTimeline` renders a virtualized fixed-height row window.
- Packet summary/search/error checks are cached in `packet-inspection.ts`.
- Packet relationships are derived in `lib/packet-relationships.ts` from retained packets, not from a separate mutable graph.
- The default retention limit is 10,000 packets and can be raised in Settings or the Memory panel.

When the limit is reached, SocketLens keeps the newest packets, removes the oldest retained packets from memory, logs a warning, and shows a toast.

## Payload Inspection

Payload inspection is intentionally defensive.

- JSON formatting is bounded and safe.
- Invalid JSON falls back to raw text.
- Large payloads are truncated in the rendered view while copy still uses the full payload.
- Metadata is derived from typed packet fields.
- Default packet decoding lives in `extensions/packet-decoder.ts`.
- Default packet analysis lives in `extensions/packet-analyzer.ts`.
- Shared JSON payload helpers live in `lib/json-payload.ts`; use them when reading common fields such as `command` or `type`.

Components should not parse arbitrary payloads unless they go through shared helper functions.

## Packet Relationships

Relationship tracking is intentionally conservative. SocketLens derives request/response links when a pair has an explicit shared `requestId`, `correlationId`, or reply reference. Auth and reconnect flows are labeled as inferred when nearby packets look like the same flow. Replay packets can carry `sendSource: "replay"` and `sourcePacketId` metadata so the UI can show the original packet without guessing.

The relationship index is rebuilt from the selected session packet list with `buildPacketRelationshipIndex()`. It is used by the timeline and payload inspector only; raw packet payloads remain unchanged.

## Extension Points

Contributor-facing extension contracts live in `apps/desktop/src/extensions`.

| Extension point | File | Purpose |
| --- | --- | --- |
| `PacketDecoder` | `extensions/packet-decoder.ts` | Decode payloads into event names, previews, tags, metadata, and typed data. |
| `PacketAnalyzer` | `extensions/packet-analyzer.ts` | Classify decoded packets as auth/chat/error/notification/heartbeat/ok. |
| `FilterEngine` | `extensions/filter-engine.ts` | Apply search/filter state to packet collections. |
| `ExportAdapter` | `extensions/export-adapter.ts` | Create and serialize export file formats. |
| `AIProvider` | `extensions/ai-provider.ts` | Register optional AI providers behind a stable interface. |
| `ReplayStrategy` | `extensions/replay-strategy.ts` | Prepare replay payloads and replay history entries. |

These are explicit TypeScript extension points, not a dynamic plugin loader. New built-in extensions should be added here first, then wired into the relevant store or service.

Detailed guidance: [extension-points.md](extension-points.md).

## Data Flow

```text
Direct WebSocket / Rust proxy / Demo generator
  -> createPacket()
  -> usePacketStore
  -> defaultFilterEngine
  -> PacketTimeline
  -> decodePacket() + defaultPacketAnalyzer
  -> PayloadInspector / search / filters / AI prompt input
```

This keeps raw captured traffic immutable while views derive summaries, previews, filters, and explanations from shared extension helpers.

## Session Persistence

Session persistence has two layers:

- `models/session-file.ts` owns JSON schemas, serialization, validation, import id remapping, and suggested file names.
- `lib/session-file-storage.ts` owns storage integration.

Desktop mode uses Tauri dialog and filesystem plugins. Browser development mode uses download/upload fallback.

## Demo Architecture

Demo code lives in `apps/desktop/src/demo`.

- `demo-stream.ts` creates a continuous synthetic stream.
- `investor-demo.ts` creates a guided deterministic offline story.

Demo traffic uses normal `Connection`, `Session`, and `Packet` records with `transport: "demo"`. It does not use the direct WebSocket runtime or proxy backend.

## AI Architecture

AI code lives under `apps/desktop/src/lib/ai`.

- `types.ts` defines provider-independent actions and result types.
- `provider-validation.ts` validates settings without network calls.
- `providers/openai-compatible.ts` calls OpenAI-compatible chat completion endpoints.
- `providers/ollama.ts` calls Ollama chat endpoints.
- `prompts.ts` builds bounded prompts for packet/session analysis.
- `index.ts` exposes `runAiAnalysis()`.

AI is optional and disabled by default. Capture, proxy, replay, timeline, session persistence, and inspector behavior must work without AI.

## Stability Patterns

SocketLens should fail softly.

- Render failures are caught by `ErrorBoundary`.
- User-facing problems appear as inline errors, toasts, and log entries.
- Direct socket handlers are detached before cleanup.
- Reconnect is manual and rate-limited.
- Proxy event listeners are registered through one controlled helper to avoid duplicate listeners.
- Native commands return typed error results instead of throwing through React render paths.

## Contribution Guidelines

- Update model types first when adding new domain fields.
- Keep demo/mock data in explicit demo or dev helpers.
- Keep native proxy responsibilities in Rust modules, not React components.
- Do not add placeholder-only UI that claims unsupported behavior works.
- Update docs when commands, settings, modes, or file formats change.
