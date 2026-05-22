# Product Brief

SocketLens is a professional desktop WebSocket debugger for developers building realtime applications. It is currently an early alpha open-source project.

## One-Sentence Pitch

SocketLens gives developers a local-first desktop workspace to inspect, search, replay, save, and reason about WebSocket traffic.

## Product Summary

SocketLens focuses on the debugging workflows that appear after a WebSocket connection is open:

- What events moved across the connection?
- Which direction did each frame travel?
- What payload caused the bug?
- Can an outbound frame be edited and replayed?
- Can the session be saved and revisited?
- Can another app connect through a local proxy for inspection?

The product is designed as a developer tool, not an analytics platform. The default stance is local-first, explicit, and privacy-conscious.

## Current Status

SocketLens is alpha software.

Currently implemented:

- Tauri + React desktop app foundation.
- Browser development mode.
- Investor Demo Mode with offline synthetic realtime traffic.
- Direct WebSocket connection mode.
- Manual send and packet replay.
- Packet timeline with search, filters, retention, and virtualized rendering.
- Payload inspector with Pretty, Raw, and Metadata views.
- Session save/load and packet export/import.
- Native Rust proxy MVP for local forwarding and frame capture.
- Settings, localization, privacy controls, and optional AI provider settings.
- Documentation, examples, CI, release workflow, and open-source project files.

Not claimed:

- No production traction is claimed.
- No revenue is claimed.
- No hosted service is currently operated.
- No stable `1.0` compatibility guarantee is claimed.

## Problem

WebSocket debugging often falls into a gap between browser devtools, backend logs, and custom scripts.

Common pain points:

- Event streams are noisy and hard to scan.
- Bugs are session-specific and hard to replay.
- Payloads need JSON-aware inspection and raw access.
- Heartbeats and system events obscure important app messages.
- External clients are difficult to observe without a proxy.
- Sensitive packet data should not be uploaded to a hosted tool by default.

## Target Users

Primary users:

- Developers building realtime web and desktop applications.
- Engineers maintaining WebSocket APIs.
- QA engineers testing stateful event flows.

Secondary users:

- Support engineers reproducing realtime issues.
- Developer advocates preparing demos.
- Open-source maintainers debugging protocol behavior.

## Why Now

More products are adopting realtime features:

- AI streaming responses.
- Collaborative editors.
- Live dashboards.
- Chat and notifications.
- Multiplayer-style interfaces.
- Presence and activity systems.

As realtime behavior becomes normal product infrastructure, developers need tooling that treats WebSocket sessions as first-class debugging artifacts.

## Product Demo Flow

Recommended first demo:

1. Start SocketLens with `npm run dev`.
2. Switch language if needed from Settings -> Language.
3. Click **Start Investor Demo**.
4. Show auth, chat, heartbeat, notification, error, replay, and offline AI explanation examples.
5. Select packets and inspect Pretty, Raw, and Metadata tabs.
6. Search/filter for `error`, `chat`, or `auth`.
7. Start the echo server with `npm run dev:echo`.
8. Connect Direct Mode to `ws://127.0.0.1:17787`.
9. Send and replay a JSON message.
10. Explain Proxy Mode as the native path for observing traffic from external clients.

## Technical Moat

SocketLens is too early to claim a proven moat. The product direction is built around a few durable technical bets:

- **Local-first by default**: valuable for sensitive developer data and easier to trust as open source.
- **Unified packet/session model**: the same data model powers demo, direct mode, proxy mode, replay, persistence, filtering, and AI analysis.
- **Native proxy capability**: Rust/Tauri can support local workflows that browser-only apps cannot.
- **Performance-aware timeline**: packet batching, caching, virtualized rendering, and retention controls are built into the core workflow.
- **Explicit AI boundary**: AI is optional, provider-agnostic, disabled by default, and only sends selected data after user action.
- **Open-source extensibility**: protocol-specific inspectors, generators, and redaction tools can grow from community contributions.

## Open-Source Strategy

SocketLens should be credible as a standalone open-source tool before it becomes a company-scale product.

Strategy:

- Keep the core debugging workflow AGPL-licensed so modified/distributed versions remain open.
- Make setup reproducible with npm workspaces and documented scripts.
- Keep examples runnable for quick evaluation.
- Publish clear privacy and security documentation.
- Accept focused contributions that improve reliability, protocol coverage, docs, and cross-platform behavior.
- Avoid hidden telemetry and unclear data movement.

## Monetization Options

There is no current revenue.

Potential future monetization should preserve a useful open-source core:

- Pro desktop features for advanced replay, redaction, and protocol tooling.
- Team workspaces for shared sanitized sessions and collections.
- Enterprise support, security review, and managed rollout assistance.
- Optional hosted sync or artifact storage.
- Paid protocol integrations or sponsored development.

Any hosted or AI-powered paid capability should remain opt-in and transparent about data movement.

## Roadmap

Alpha stabilization:

- Validate release builds across Windows, macOS, and Linux.
- Publish first downloadable alpha artifacts.
- Add product screenshots and a short demo GIF.
- Harden proxy mode with more failure-case testing.
- Improve session schema validation and migration paths.

Next product layer:

- Saved connection profiles and workflow shortcuts.
- Better reconnect and diagnostics flows.
- Protocol-aware event inspectors.
- Redaction tools for safe sharing.
- Authentication helper templates.

Longer term:

- Extensible plugin hooks.
- Team-shareable collections.
- Optional signed updates and hosted collaboration.

## Risks

- Developer adoption depends on being clearly better than browser devtools for repeated WebSocket workflows.
- Cross-platform Tauri builds and signing require ongoing release discipline.
- Proxy mode has edge cases around close frames, binary data, TLS, and local networking.
- Sensitive packet data requires strong privacy defaults and clear user education.
- Optional AI can damage trust if boundaries are unclear.
- Open-source contribution velocity is uncertain before a community forms.

## Next Milestones

- Complete public GitHub launch materials.
- Run full CI on GitHub.
- Validate native build workflow with Cargo and Tauri prerequisites.
- Publish first alpha release artifacts.
- Record the Investor Demo flow.
- Identify first contributor-friendly issues.
- Collect early feedback from developers using local WebSocket services.

## Positioning Notes

Use these claims:

- "Early alpha."
- "Open-source."
- "Local-first by default."
- "Usable today for demo, direct mode, local echo-server testing, session files, and native proxy testing."
- "AI is optional and disabled by default."

Avoid these claims until proven:

- "Used by teams at..."
- "Revenue-generating."
- "Production hardened."
- "Enterprise ready."
- "Best-in-class."
- "Fully secure."
- "Stable API."
