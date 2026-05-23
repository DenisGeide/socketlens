# SocketLens

![SocketLens banner](docs/assets/branding/banner.png)

[![CI](https://github.com/DenisGeide/socketlens/actions/workflows/ci.yml/badge.svg)](https://github.com/DenisGeide/socketlens/actions/workflows/ci.yml)
[![Release](https://github.com/DenisGeide/socketlens/actions/workflows/release.yml/badge.svg)](https://github.com/DenisGeide/socketlens/actions/workflows/release.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)

**Project status: Public Alpha, `v1.0.0-alpha`**

SocketLens is a local-first WebSocket debugging workspace for developers building realtime applications.

It gives WebSocket traffic a proper developer-tool workspace: a packet timeline, payload inspector, filters, replay, session export/redaction, demo traffic, and an optional desktop proxy.

## Why SocketLens Exists

Browser DevTools can show WebSocket frames, but debugging real realtime systems usually needs more than a raw frame table:

- auth, chat, presence, notifications, heartbeat, retries, reconnects, and errors share the same stream;
- noisy heartbeat traffic hides the frame that actually matters;
- replaying an outbound message is awkward;
- sharing a useful debug session can leak tokens or cookies;
- protocol envelopes such as Socket.IO or GraphQL WS make raw payloads harder to read;
- external clients cannot always be inspected from the browser that owns DevTools.

SocketLens is built for that workflow: inspect packets, understand event flow, replay messages, save clean sessions, and extend protocol understanding without rewriting the core.

## Screenshots

Screenshots below are captured from implemented SocketLens behavior. Screenshot guidance lives in [docs/screenshots.md](docs/screenshots.md).

| Main workspace | Demo mode |
|---|---|
| ![SocketLens main UI](docs/assets/screenshots/main-ui.png) | ![SocketLens demo mode](docs/assets/screenshots/demo-mode.png) |

| Direct mode | Proxy mode |
|---|---|
| ![SocketLens direct mode](docs/assets/screenshots/direct-mode.png) | ![SocketLens proxy mode](docs/assets/screenshots/proxy-mode.png) |

| Payload inspector | Settings |
|---|---|
| ![SocketLens packet inspector](docs/assets/screenshots/packet-inspector.png) | ![SocketLens settings](docs/assets/screenshots/settings.png) |

## Feature Overview

What works in `v1.0.0-alpha`:

- **Demo Mode**: simulated offline traffic clearly marked as demo data.
- **Direct Mode**: connect directly to `ws://` or `wss://` endpoints.
- **Proxy Mode**: Tauri/Rust local proxy MVP for external clients.
- **Packet Timeline**: virtualized frame list with direction, event name, timestamp, size, preview, badges, grouping, search, and filters.
- **Payload Inspector**: Pretty JSON, Raw, Metadata, copy, large view, and safe invalid JSON handling.
- **Manual Send and Replay**: send JSON/raw text, reuse outgoing packets, edit before replay, replay selected packets or sequences while connected.
- **Filters and Grouping**: text/regex search, event filters, JSON/errors-only filters, hide heartbeat/ping-pong, smart payload conditions, presets, and grouping.
- **Sessions and Redaction**: save/load session JSON, export packets, redact sensitive values before sharing, and export experimental AsyncAPI-like drafts.
- **Environments**: Local/Staging/Production variables and connection profiles with `{{base_url}}` interpolation.
- **Protocol Understanding**: initial Socket.IO and GraphQL over WebSocket decoding with raw fallback.
- **Diagnostics**: copy/export a privacy-safe diagnostic bundle.
- **Optional AI**: disabled by default; OpenAI-compatible and Ollama providers can explain selected packet/session context after explicit user action.
- **Extension Points**: typed contracts for decoders, analyzers, filters, exporters, AI providers, plugins, and replay strategies.

Current alpha limitations are listed in [Current Alpha Limitations](#current-alpha-limitations) and [docs/final-alpha-summary.md](docs/final-alpha-summary.md).

## Quick Start

Prerequisites for browser mode:

- Node.js `20.19.0+` on the 20.x line, or `22.12.0+`
- npm `10+`

Clone, install, and run web mode:

```bash
git clone https://github.com/DenisGeide/socketlens.git
cd socketlens
npm install
npm run dev
```

Expected result:

```text
SocketLens opens at http://127.0.0.1:1420/
```

What to click first:

1. Click **Start Investor Demo**.
2. Select a packet in the timeline.
3. Inspect Pretty, Raw, and Metadata in the right panel.
4. Open Manual Send after connecting to a real echo server.

More detail: [docs/installation.md](docs/installation.md), [docs/quickstart.md](docs/quickstart.md), and [docs/getting-started.md](docs/getting-started.md).

## One-click Launchers

Convenience launchers live in [launchers](launchers). They call the same npm scripts documented below.

Windows:

```bat
launchers\install-windows.bat
launchers\start-web.bat
launchers\start-echo-server.bat
launchers\start-desktop.bat
launchers\generate-shortcuts.bat
```

macOS/Linux:

```bash
sh ./launchers/install-unix.sh
sh ./launchers/start-web.sh
sh ./launchers/start-echo-server.sh
sh ./launchers/start-desktop.sh
```

The start launchers check for `node_modules` and run `npm install` on first launch if dependencies are missing. Node.js/npm must still be installed first. Desktop mode also needs Rust/Cargo and Tauri OS prerequisites.

## Downloadable Releases

SocketLens is currently source-first alpha software. The most reliable public path is still:

```bash
npm install
npm run dev
```

Unsigned desktop artifacts will be attached to GitHub Releases only after the release workflow validates the build on each target platform.

Expected artifact families:

- Windows: `.msi` or `.exe`
- macOS: `.dmg` or `.app`
- Linux: `.AppImage`, `.deb`, or `.rpm`

Until code signing is configured, operating systems may show unidentified-developer warnings for downloaded desktop builds.

Read: [docs/release.md](docs/release.md) and [docs/releases/v1.0.0-alpha.md](docs/releases/v1.0.0-alpha.md).

## Demo Mode

Demo Mode is the fastest way to understand SocketLens without setup.

It creates simulated realtime traffic: auth, chat, presence, notification, heartbeat, reconnect, error, streaming, and replay examples. Demo traffic is clearly marked as simulated.

Read: [docs/demo-mode.md](docs/demo-mode.md).

## Direct Mode

Direct Mode means SocketLens owns the WebSocket connection.

Start the local echo server:

```bash
npm run dev:echo
```

Connect SocketLens to:

```text
ws://127.0.0.1:17787
```

Send:

```json
{ "command": "ping" }
```

Expected result: SocketLens captures the outbound message and inbound echo/`command.pong` response.

Read: [docs/direct-mode.md](docs/direct-mode.md).

## Proxy Mode

Proxy Mode means another client connects through SocketLens.

Use it when you need to inspect traffic from an external app rather than a connection owned by SocketLens.

Requirements:

- `npm run dev:desktop`
- Rust/Cargo and Tauri prerequisites
- target WebSocket server, for example `npm run dev:echo`

Read: [docs/proxy-mode.md](docs/proxy-mode.md) and [docs/troubleshooting.md](docs/troubleshooting.md).

## Socket.IO and GraphQL WS

SocketLens keeps Raw payloads available and layers conservative protocol understanding on top.

Implemented protocol-aware behavior:

- JSON event-name inference;
- Socket.IO / Engine.IO frame detection;
- GraphQL over WebSocket envelope detection;
- safe fallback for unknown frames.

Run the Socket.IO demo:

```bash
npm run dev:socketio
```

Read: [docs/socketio.md](docs/socketio.md), [docs/graphql-ws.md](docs/graphql-ws.md), and [docs/adding-a-decoder.md](docs/adding-a-decoder.md).

## Environments

Environments let you switch Local/Staging/Production variables without rewriting connection URLs.

Example:

```text
{{base_url}}?token={{auth_token}}
```

Values are stored locally. Secret values are hidden in UI previews, but exported environment files include values, so do not commit real tokens.

Read: [docs/environments.md](docs/environments.md).

## Replay

Replay helps reproduce outbound messages while debugging.

Implemented replay behavior:

- replay selected outbound packet;
- edit payload before replay;
- replay last outgoing packet;
- replay selected sequence when available;
- configure delay controls;
- block replay while disconnected.

Read: [docs/replay.md](docs/replay.md).

## Filters and Grouping

SocketLens is built for noisy realtime streams.

Filtering includes text search, regex search, direction filters, JSON-only, errors-only, hide heartbeat, hide ping/pong, event filtering, saved presets, and simple JSON-path-like conditions.

Grouping can collapse repeated events, heartbeat storms, auth flows, reconnect flows, and related packets without deleting original data.

Read: [docs/filters.md](docs/filters.md) and [docs/grouping.md](docs/grouping.md).

## Sessions, Export, and Redaction

SocketLens sessions can be saved, loaded, exported, imported, and redacted before sharing.

Redaction can remove common tokens, cookies, auth headers, API keys, password-like fields, sensitive URL query values, and custom literal/regex matches from exported copies.

AsyncAPI-like export exists as an experimental inferred draft.

Read: [docs/sessions.md](docs/sessions.md), [docs/redaction.md](docs/redaction.md), and [docs/asyncapi-export.md](docs/asyncapi-export.md).

## AI Features and Privacy

AI is optional and disabled by default.

Supported provider shapes:

- Disabled;
- OpenAI-compatible endpoint;
- Ollama.

SocketLens never sends packet data to AI automatically. Data is sent only after the user explicitly clicks an AI action, and only to the configured provider.

Read: [docs/ai.md](docs/ai.md), [docs/privacy.md](docs/privacy.md), and [docs/security-model.md](docs/security-model.md).

## Architecture Overview

SocketLens is a monorepo with:

- React + TypeScript + Vite frontend;
- Zustand stores;
- Tailwind/shadcn-style UI;
- Tauri desktop shell;
- Rust backend for native proxy mode;
- Node/TypeScript examples.

Core packet flow:

```text
Demo generator / Direct WebSocket / Rust proxy
  -> Packet model
  -> Packet store
  -> Filter/decoder/analyzer pipeline
  -> Timeline + Inspector + Replay + Export
```

Read: [docs/architecture.md](docs/architecture.md), [docs/project-structure.md](docs/project-structure.md), and [docs/function-inventory.md](docs/function-inventory.md).

## Extension Points

SocketLens is designed so contributors can extend the product without rewriting the core.

Source-level contracts:

- `PacketDecoder`
- `PacketAnalyzer`
- `FilterEngine`
- `ExportAdapter`
- `AIProvider`
- `ReplayStrategy`
- local plugin registry foundation

Read: [docs/extension-points.md](docs/extension-points.md), [docs/plugins.md](docs/plugins.md), [docs/adding-a-decoder.md](docs/adding-a-decoder.md), [docs/adding-a-filter.md](docs/adding-a-filter.md), and [docs/adding-ai-provider.md](docs/adding-ai-provider.md).

## Documentation Map

Start here:

- [Documentation index](docs/README.md)
- [Installation](docs/installation.md)
- [Quickstart](docs/quickstart.md)
- [Manual QA](docs/manual-qa.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Function inventory](docs/function-inventory.md)

Contributor docs:

- [Contributor guide](docs/contributor-guide.md)
- [Architecture](docs/architecture.md)
- [Architecture rules](docs/architecture-rules.md)
- [Extension points](docs/extension-points.md)
- [Project structure](docs/project-structure.md)

Trust and release docs:

- [Privacy](docs/privacy.md)
- [Security model](docs/security-model.md)
- [Release guide](docs/release.md)
- [Roadmap](docs/roadmap.md)
- [Final alpha summary](docs/final-alpha-summary.md)

## Development Commands

Run from the repository root.

| Command | What it does |
|---|---|
| `npm install` | Installs all npm workspace dependencies. |
| `npm run dev` | Starts web mode at `http://127.0.0.1:1420/`. |
| `npm run dev:desktop` | Starts the native Tauri desktop app. |
| `npm run dev:echo` | Starts the echo server at `ws://127.0.0.1:17787`. |
| `npm run dev:socketio` | Starts the Socket.IO demo server at `ws://127.0.0.1:17810`. |
| `npm run dev:chat` | Starts the local browser chat demo. |
| `npm run dev:landing` | Starts the landing page. |
| `npm run lint` | Runs repository hygiene checks. |
| `npm run typecheck` | Typechecks all workspaces. |
| `npm run test` | Runs unit tests. |
| `npm run build` | Builds all buildable workspaces. |
| `npm run build:desktop` | Builds the Tauri desktop bundle. |
| `npm run check` | Runs clean, encoding check, lint, typecheck, tests, build, then clean. |
| `npm run clean` | Removes generated build output. |
| `npm run release:prepare` | Validates release metadata and version consistency. |
| `npm run release:build` | Runs release preparation and builds the desktop bundle. |

Before opening a pull request:

```bash
npm run check
```

## Contributing

Contributions are welcome, especially changes that improve clarity, stability, tests, documentation, first-run experience, and protocol understanding.

Good first contributions:

- test the quickstart on a fresh machine;
- improve an unclear error state;
- add tests for packet parsing/filtering/session files;
- add a focused decoder/analyzer rule;
- improve docs when commands or workflows are unclear.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contributor-guide.md](docs/contributor-guide.md).

## Current Alpha Limitations

- Desktop builds are unsigned.
- Proxy Mode requires desktop/Tauri mode and is still an MVP.
- Browser mode cannot start the Rust proxy.
- Runtime remote plugins and a plugin marketplace are not implemented.
- Socket.IO and GraphQL WS support are initial decoders, not complete protocol suites.
- MessagePack, BSON, and Protobuf are roadmap/foundation work.
- AsyncAPI export is experimental and inferred.
- AI is optional, disabled by default, and may be wrong.
- No telemetry, accounts, hosted sync, cloud workspace, or paid service exists in this alpha.

## Roadmap

Near-term priorities:

- polish onboarding and documentation;
- harden Direct Mode and Proxy Mode;
- improve replay/session QA;
- expand decoder and filter tests;
- prepare unsigned alpha desktop artifacts;
- keep the core local-first and contributor-friendly.

Read [docs/roadmap.md](docs/roadmap.md) and [ROADMAP.md](ROADMAP.md).

## License

SocketLens is licensed under `AGPL-3.0-only`.

You can use SocketLens freely, including at work. You can fork it, modify it, and run it locally. If you distribute a modified version or run a modified network-accessible version as a service, AGPL generally requires sharing the corresponding source code for that modified version.

AGPL applies to SocketLens code. It does not make your inspected WebSocket traffic, payloads, private endpoints, session files, or application code part of SocketLens.

See [LICENSE](LICENSE) and [docs/license.md](docs/license.md). The documentation is educational only and is not legal advice.
