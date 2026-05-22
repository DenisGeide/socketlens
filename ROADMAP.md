# Roadmap

SocketLens is in alpha. The roadmap is deliberately focused on making a trustworthy, runnable WebSocket debugger instead of a broad mockup.

## Current Status

SocketLens is currently an open-source alpha aimed at local development, contributor onboarding, and investor/product demos. It is usable for:

- guided offline demos,
- direct WebSocket connections from inside SocketLens,
- local echo-server testing,
- manual send and replay,
- packet timeline inspection,
- local session files,
- native proxy MVP testing in the Tauri desktop app.

It is not yet a signed, stable, paid, hosted, or enterprise-ready product.

## v0.1.0-alpha Freeze

The project is in `v0.1.0-alpha` stabilization mode. Until the alpha tag is cut, new work should focus on release blockers, bug fixes, onboarding clarity, documentation corrections, privacy/security wording, CI/release fixes, and small UI clarity improvements.

Large feature work, broad refactors, new AI capabilities, cloud/account work, telemetry, billing, and enterprise proxy expansion are intentionally deferred.

Freeze details and the readiness checklist live in [docs/v0.1.0-alpha-freeze.md](docs/v0.1.0-alpha-freeze.md).

## Known Limitations

- Desktop artifacts are unsigned until signing is configured.
- Proxy Mode is an MVP for local debugging and needs more cross-platform validation.
- Native checks require Rust, Cargo, and Tauri platform prerequisites.
- Browser development mode cannot run native proxy listeners.
- Release asset folders and brand placeholders exist under `docs/assets`; final captured screenshots and demo GIFs still need validation from real app states.
- AI is optional and provider-dependent; it is not part of the core debugger requirement.
- Experimental AsyncAPI export creates an inferred YAML draft only. It is not a validated API contract and needs manual review before sharing.
- No telemetry, hosted sync, cloud workspace, account system, or monetized service exists today.

## Completed For 0.1 Alpha

- Runnable npm monorepo with desktop app, landing page, echo server, and chat demo workspaces.
- Tauri, React, TypeScript, Vite, TailwindCSS, shadcn/ui-style primitives, and Zustand desktop foundation.
- Polished first-run UI with packet timeline, payload inspector, logs, settings, and responsive panels.
- Investor Demo Mode and continuous demo stream for offline evaluation.
- Direct WebSocket mode with connect, disconnect, receive, manual send, and packet replay.
- Native Rust proxy MVP for local client-to-target WebSocket forwarding and frame capture.
- Search, filters, packet retention controls, session save/load, packet import/export, and high-volume timeline behavior.
- Russian default UI with English fallback and persisted language switching.
- Optional AI analysis architecture with OpenAI-compatible and Ollama providers, disabled by default.
- Documentation, issue templates, CI, release workflow, release-preparation checks, and security/privacy guidance.

## Planned Improvements

The near-term plan is to make the existing workflows more reliable before expanding scope.

### 0.1 Alpha Stabilization

- Validate native Tauri builds on Windows, macOS, and Linux release runners.
- Publish first unsigned downloadable artifacts from the GitHub release workflow.
- Add final captured product screenshots and a short demo recording to the README.
- Commit reproducible native build metadata after validating the Tauri/Rust release environment.
- Tighten failure-case testing around proxy disconnects, malformed frames, and imported session files.

### 0.2 Debugging Workflow

- Saved connection profiles with clearer grouping and recent-workflow shortcuts.
- Stronger reconnect controls for direct mode and proxy clients.
- Session schema versioning and migration helpers.
- More protocol-aware payload detection for common realtime event conventions.
- Deeper GraphQL over WebSocket support: operation/result linking, query previews, and optional schema-aware helpers without turning SocketLens into a full GraphQL IDE.
- Binary decoder work for Protobuf, MessagePack, and BSON. MessagePack/BSON currently have documented stubs only; raw binary fallback remains the user-facing behavior until real fixture-backed decoders exist.
- Improved diagnostics for TLS, localhost binding, CORS-like client mistakes, and server close frames.

### 0.3 Advanced Realtime Tooling

- Authentication helper templates for common WebSocket handshakes.
- Request/event collections for repeatable realtime test flows.
- Safer redaction tools for sharing session files in issues or teams.
- AsyncAPI draft export validation, richer schema inference, and clearer protocol-specific channel mapping.
- Proxy-mode capture controls for binary frames and large payloads.
- Extensible inspector hooks for protocol-specific renderers.
- Fixture-backed MessagePack and BSON decoding if real users need those protocols.

### Later

- Team-shareable workspaces.
- Plugin system for custom inspectors and generators.
- AI-assisted mock server generation from recorded sessions. This is a future direction, not a current feature: a user could eventually record a session, review and sanitize it, then generate a local mock server draft that replays representative event flows.
- Optional signed auto-update channel after the project has stable release infrastructure.

Foundations needed before any AI mock-server generation work:

- stable versioned session format,
- conservative flow analysis,
- replay sequence modeling,
- sanitized export and redaction workflows,
- reliable optional AI provider behavior and clear provider error states.

## How to Help

The most useful contributions right now are small, testable improvements:

- run the first-run flow on a fresh machine and report setup friction,
- test Direct Mode against real local WebSocket servers,
- test Proxy Mode in `npm run dev:desktop` on Windows, macOS, or Linux,
- improve unclear docs, empty states, or error messages,
- add focused tests around packet parsing, filtering, session files, and proxy edge cases,
- provide screenshots or recordings that show implemented behavior honestly.

Large cloud features, team accounts, telemetry, billing, and enterprise proxy work are intentionally out of scope until the local alpha workflow is stable.
