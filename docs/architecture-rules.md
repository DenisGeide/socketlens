# Architecture Rules

SocketLens is an alpha developer tool, but the base should stay stable enough that contributors extend it instead of rewriting it.

These rules are practical guardrails for code review.

## 1. Keep The Core Packet Shape Stable

The central flow is:

```text
Connection -> Session -> Packet -> derived views
```

`Packet` is the source of truth for captured frames. Decoders, analyzers, filters, relationships, AI prompts, exports, and UI views should derive from packets instead of replacing or mutating them.

Rules:

- Do not mutate captured payloads.
- Do not change session/export schemas without versioning and migration.
- Do not store browser `WebSocket` objects or native handles in persisted state.

## 2. Respect Layer Boundaries

| Layer | Allowed | Not allowed |
| --- | --- | --- |
| `components` | render UI, handle user interaction, local visual state | protocol parsing, native command internals, file schemas |
| `models` | domain types, normalization, validation, pure helpers | React, browser APIs, Tauri APIs |
| `store` | runtime state and lifecycle coordination | visual formatting, protocol-specific parsing in render paths |
| `lib` | services, Tauri wrappers, storage, formatting, AI runtime, safe parsing | component trees |
| `extensions` | decoders, analyzers, filters, exporters, AI provider contracts, replay strategy | sockets, stores, files, React state |
| `src-tauri` | native commands, proxy runtime, backend state, user-safe errors | frontend state or React concepts |

If a component needs a complex helper, move the helper to `models`, `lib`, or `extensions` and test it.

## 3. Keep Capture Modes Separate

Demo, Direct, and Proxy Mode all produce packets, but their lifecycle code should stay separate.

- Demo code lives in `apps/desktop/src/demo`.
- Direct WebSocket lifecycle lives in `apps/desktop/src/store/connection-store.ts`.
- Proxy runtime lives in Rust under `apps/desktop/src-tauri/src`.
- Tauri event mapping lives in `apps/desktop/src/lib/proxy-events.ts`.

Do not mix proxy lifecycle into Direct Mode or demo generation into production capture code.

## 4. Use Extension Points Before Core Rewrites

Prefer these contracts:

- `PacketDecoder` for protocol parsing,
- `PacketAnalyzer` for semantic status/category,
- `FilterEngine` for search/filter behavior,
- `ExportAdapter` for export formats,
- `AIProvider` for optional AI integrations,
- `ReplayStrategy` for replay payload preparation.

If a feature can be expressed through one of these, use the extension point instead of changing timeline, inspector, or stores.

## 5. Keep AI Optional

AI must never be required for:

- capture,
- replay,
- filters,
- timeline,
- inspector,
- session save/load,
- exports,
- proxy mode.

AI providers must:

- validate settings before calls,
- send data only after explicit user action,
- keep API keys local,
- show clear privacy copy,
- return user-safe errors.

## 6. Keep Privacy Local-First

SocketLens has no telemetry by default. Do not add hidden network calls.

Do not log:

- API keys,
- bearer tokens,
- cookies,
- private endpoint URLs with credentials,
- raw production payloads,
- imported session contents.

Diagnostics and bug-report helpers must exclude sensitive payload content by default.

## 7. Browser And Desktop Must Fail Differently

Browser mode can run Demo Mode and Direct Mode. It cannot run native proxy commands.

Rules:

- Components should use `tauri-commands.ts` wrappers, not direct `invoke`.
- Browser-only failures should be friendly and explicit.
- Native-only docs should mention `npm run dev:desktop`.

## 8. Performance Rules

SocketLens should handle high packet counts without making the UI feel unstable.

Rules:

- Keep decoder `canDecode()` cheap.
- Keep filter matching synchronous and fast.
- Avoid parsing large JSON repeatedly in render paths.
- Preserve virtualization in the packet timeline.
- Do not add per-packet React state for large lists.
- Prefer derived helpers with tests over component-local ad hoc parsing.

## 9. Documentation And Tests

Update docs when a change affects:

- install/setup commands,
- capture modes,
- session or export format,
- privacy/data flow,
- extension contracts,
- public alpha limitations.

Add or update tests when changing:

- models,
- decoders,
- filters,
- redaction,
- session serialization,
- AI provider validation,
- replay strategy.

Run before PR:

```bash
npm run check
```

If native backend changed:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Review Red Flags

Pause review when a change:

- parses protocol payloads inside React components,
- mutates captured packet data,
- makes AI part of normal app startup,
- logs secrets or raw production payloads,
- adds a placeholder button that does not work,
- adds a dependency for one small helper,
- changes export/session shape without migration,
- mixes Demo, Direct, and Proxy lifecycle code,
- hides errors behind generic `Failed to fetch` messages.
