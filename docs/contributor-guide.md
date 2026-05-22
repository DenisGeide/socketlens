# Contributor Guide

This guide is for contributors who want to extend SocketLens without rewriting the core.

SocketLens should stay easy to run, local-first, and understandable. A good contribution usually adds a decoder, filter, exporter, AI provider, UI panel, test, or documentation improvement while preserving the existing packet flow.

## Quick Setup

```bash
npm install
npm run dev
```

Run the local echo server in a second terminal when testing real WebSocket traffic:

```bash
npm run dev:echo
```

Run the native desktop app only when testing Tauri, native file dialogs, or Proxy Mode:

```bash
npm run dev:desktop
```

Desktop mode requires Rust/Cargo and Tauri platform prerequisites.

## Mental Model

SocketLens has three packet sources:

- **Demo Mode** creates simulated packets in `apps/desktop/src/demo`.
- **Direct Mode** opens a browser/WebView `WebSocket` from `apps/desktop/src/store/connection-store.ts`.
- **Proxy Mode** runs through the Rust/Tauri backend in `apps/desktop/src-tauri/src/proxy.rs`.

All three paths produce the same domain records:

```text
Connection -> Session -> Packet -> Timeline / Inspector / Filters / Replay / Export
```

That shared shape is the core. Extensions should read from it and add interpretation around it, not replace it.

## Where New Work Goes

| Change | Start here | Rule of thumb |
| --- | --- | --- |
| UI panel, layout, empty state, visual polish | `apps/desktop/src/components` | Keep rendering and user interaction here. Move parsing/business logic out. |
| Shared UI primitive | `apps/desktop/src/components/ui` | Keep generic and small. |
| Packet/session/connection/settings shape | `apps/desktop/src/models` | Pure TypeScript models and validation only. No browser/Tauri APIs. |
| Direct WebSocket behavior | `apps/desktop/src/store/connection-store.ts` | Owns socket lifecycle and send/replay integration. |
| Packet batching and retention | `apps/desktop/src/store/packet-store.ts` | Owns retained packet collection. |
| Session lifecycle | `apps/desktop/src/store/session-store.ts` | Owns session records and counters. |
| UI state, logs, filters, replay draft | `apps/desktop/src/store/ui-store.ts` | Owns selected ids and UI coordination. |
| Settings persistence | `apps/desktop/src/store/settings-store.ts`, `apps/desktop/src/lib/settings-persistence.ts` | Persist local settings defensively. |
| Demo traffic | `apps/desktop/src/demo` | Keep simulated/demo traffic clearly labeled. |
| Protocol decoding | `apps/desktop/src/extensions/packet-decoder.ts` | Implement `PacketDecoder`; do not parse protocols in React. |
| Packet classification | `apps/desktop/src/extensions/packet-analyzer.ts` | Implement cheap deterministic packet summaries/statuses. |
| Search/filter logic | `apps/desktop/src/extensions/filter-engine.ts`, `apps/desktop/src/models/filter-state.ts` | Keep matching fast and testable. |
| Export formats | `apps/desktop/src/extensions/export-adapter.ts`, `apps/desktop/src/models/session-file.ts` | Keep serialization deterministic and version-aware. |
| AI provider runtime | `apps/desktop/src/extensions/ai-provider.ts`, `apps/desktop/src/lib/ai` | AI stays optional and disabled by default. |
| Replay behavior | `apps/desktop/src/extensions/replay-strategy.ts` | Prepare payloads/history only; stores still send packets. |
| Tauri bridge | `apps/desktop/src/lib/tauri-commands.ts`, `apps/desktop/src/lib/proxy-events.ts` | Components should not call `invoke` directly. |
| Rust backend | `apps/desktop/src-tauri/src` | Native commands, proxy runtime, backend state, and user-safe errors. |
| Examples | `examples/echo-server`, `examples/socketio-demo`, `examples/chat-demo` | Keep examples runnable with root npm scripts. |

If a change does not fit one row, stop and write down the boundary before coding.

## Packet Flow

Direct Mode:

```text
User connects to ws:// or wss://
  -> connection-store opens WebSocket
  -> session-store starts/updates Session
  -> createPacket() creates typed Packet
  -> packet-store batches and retains packets
  -> ui-store selects, filters, logs, and tracks replay state
  -> timeline and inspector derive display data
```

Proxy Mode:

```text
User starts proxy in desktop mode
  -> tauri-commands.ts calls typed Rust command
  -> proxy.rs starts local proxy listener
  -> external client connects to local proxy URL
  -> Rust forwards frames and emits events
  -> proxy-events.ts maps events into stores
  -> same timeline/inspector/session path as Direct Mode
```

Demo Mode:

```text
Demo generator creates simulated packets
  -> packets are marked as demo traffic
  -> same packet/session stores
  -> same timeline/inspector/filter/replay UI
```

## Decoder Registry In Plain English

`DecoderRegistry` lives in `apps/desktop/src/extensions/packet-decoder.ts`.

It receives a packet, orders decoders by `priority`, runs the first decoder whose `canDecode(packet)` returns `true`, and returns a stable `DecodedPacket`.

Important rules:

- `SocketIoDecoder` and `GraphqlWsDecoder` run before generic JSON/text fallback.
- `JsonDecoder` handles normal JSON packets.
- `RawBinaryDecoder` handles unknown binary packets.
- `FallbackDecoder` keeps SocketLens stable when nothing else matches.
- If a decoder throws, the registry falls back and records fallback metadata instead of crashing UI.

More detail: [adding-a-decoder.md](adding-a-decoder.md).

## How Not To Break Core

Follow [architecture-rules.md](architecture-rules.md). The short version:

- Do not mutate captured packet payloads.
- Do not put protocol parsing inside React components.
- Do not make AI required for capture, replay, sessions, filters, or inspector.
- Do not call Tauri `invoke` directly from components.
- Do not merge Demo, Direct, and Proxy lifecycle code.
- Do not add UI that claims an unsupported feature works.
- Do not log secrets, tokens, private URLs, or raw production payloads.

## Extension Guides

- [adding-a-decoder.md](adding-a-decoder.md): add protocol understanding such as Socket.IO, GraphQL WS, or future binary formats.
- [adding-a-filter.md](adding-a-filter.md): add packet search/filter behavior safely.
- [adding-ai-provider.md](adding-ai-provider.md): add an optional AI provider without changing privacy defaults.
- [plugins.md](plugins.md): group local decoders/analyzers/filters/exporters as explicit source-level plugins.
- [extension-points.md](extension-points.md): overview of all contributor-facing contracts.

## How To Run Checks

Use targeted checks while developing:

```bash
npm run typecheck
npm run test
npm run build
```

Run the full repository check before opening a pull request:

```bash
npm run check
```

If your change touches Rust/Tauri, Proxy Mode, native commands, native file dialogs, or desktop packaging, also run:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run dev:desktop
```

Use [manual-qa.md](manual-qa.md) for release-style validation.

## How To Open A PR

1. Choose one focused change.
2. Keep the branch small enough to review.
3. Add or update tests when shared logic changes.
4. Update docs only when setup, commands, behavior, privacy, file formats, or extension contracts change.
5. Run `npm run check`.
6. Include screenshots or recordings for UI changes.
7. Describe known limitations honestly.

PR description should include:

```text
What changed:
How I tested:
Screenshots/recordings:
Known limitations:
```

## Good First Contributions

- Add tests for decoder fallback behavior.
- Improve one confusing empty state or validation message.
- Add a small packet analyzer rule.
- Improve a docs page with exact commands and expected results.
- Add missing translations for existing UI.
- Add a safe export adapter with tests.

Avoid starting with cloud sync, accounts, telemetry, marketplace plugins, broad proxy rewrites, or enterprise policy systems.

## Related

- [Architecture](architecture.md)
- [Architecture Rules](architecture-rules.md)
- [Extension Points](extension-points.md)
- [Function Inventory](function-inventory.md)
- [Manual QA](manual-qa.md)

## Next Steps

- Add a decoder: [Adding a Decoder](adding-a-decoder.md)
- Add a filter: [Adding a Filter](adding-a-filter.md)
- Add an AI provider: [Adding an AI Provider](adding-ai-provider.md)
