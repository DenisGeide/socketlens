# SocketLens Documentation

Purpose: this is the documentation index for SocketLens. Use it to find the right guide without reading the repository from top to bottom.

SocketLens documentation is written in English to match the public repository style. The application UI itself supports Russian and English.

## Recommended Reading Paths

### New users

1. [Installation](installation.md)
2. [Quickstart](quickstart.md)
3. [Demo Mode](demo-mode.md)
4. [Direct Mode](direct-mode.md)
5. [Troubleshooting](troubleshooting.md)

### Contributors

1. [Contributor Guide](contributor-guide.md)
2. [Architecture](architecture.md)
3. [Architecture Rules](architecture-rules.md)
4. [Extension Points](extension-points.md)
5. [Function Inventory](function-inventory.md)
6. [Manual QA](manual-qa.md)

### Protocol and extension contributors

1. [Adding a Decoder](adding-a-decoder.md)
2. [Socket.IO Support](socketio.md)
3. [GraphQL WS Support](graphql-ws.md)
4. [Adding a Filter](adding-a-filter.md)
5. [Adding an AI Provider](adding-ai-provider.md)
6. [Plugins](plugins.md)

### Public launch and release work

1. [Final Alpha Summary](final-alpha-summary.md)
2. [GitHub Launch Guide](github-launch.md)
3. [Screenshots](screenshots.md)
4. [Release Guide](release.md)
5. [Roadmap](roadmap.md)

## User Guides

| Page | Purpose |
|---|---|
| [Getting Started](getting-started.md) | Short orientation page that routes new users to install, demo, direct, and proxy docs. |
| [Installation](installation.md) | Prerequisites, Node/npm, Rust/Tauri requirements, and install commands. |
| [Quickstart](quickstart.md) | Two-minute first run using Demo Mode and the local echo server. |
| [Demo Mode](demo-mode.md) | Simulated offline traffic, investor demo, and demo limitations. |
| [Direct Mode](direct-mode.md) | Connect SocketLens directly to a WebSocket endpoint. |
| [Proxy Mode](proxy-mode.md) | Use the Tauri/Rust local proxy for external clients. |
| [Environments](environments.md) | Local/Staging/Production variables and connection profiles. |
| [Replay](replay.md) | Replay selected packets, edited payloads, and sequences. |
| [Filters](filters.md) | Search, regex, smart filters, presets, and invalid filter behavior. |
| [Grouping](grouping.md) | Collapse repeated events, heartbeat storms, and flow-like packet groups. |
| [Sessions](sessions.md) | Save, load, import, export, and understand session files. |
| [Redaction](redaction.md) | Remove sensitive values before sharing session exports. |
| [Diagnostics](diagnostics.md) | Copy/export privacy-safe diagnostics for bug reports. |
| [AI](ai.md) | Optional AI explanation workflow and provider setup. |
| [FAQ](faq.md) | Short answers to common questions. |
| [Troubleshooting](troubleshooting.md) | Common startup, connection, proxy, JSON, and provider issues. |

## Protocol Docs

| Page | Purpose |
|---|---|
| [Socket.IO](socketio.md) | Initial Engine.IO/Socket.IO detection and demo server. |
| [GraphQL WS](graphql-ws.md) | Initial GraphQL over WebSocket envelope detection. |
| [Packet Relationships](packet-relationships.md) | Request/response and inferred relationship behavior. |
| [AsyncAPI Export](asyncapi-export.md) | Experimental inferred AsyncAPI-like draft export. |

## Contributor Docs

| Page | Purpose |
|---|---|
| [Architecture](architecture.md) | Frontend/backend structure, packet flow, Tauri bridge, and diagrams. |
| [Project Structure](project-structure.md) | Where code, docs, launchers, examples, and assets live. |
| [Contributor Guide](contributor-guide.md) | How to extend SocketLens safely. |
| [Development](development.md) | Local development workflow and checks. |
| [Architecture Rules](architecture-rules.md) | Guardrails for maintainability. |
| [Extension Points](extension-points.md) | Source-level extension contracts. |
| [Plugins](plugins.md) | Local source-level plugin foundation. |
| [Adding a Decoder](adding-a-decoder.md) | Add protocol decoding without touching UI internals. |
| [Adding a Filter](adding-a-filter.md) | Add filter behavior safely. |
| [Adding an AI Provider](adding-ai-provider.md) | Add optional AI providers while preserving privacy defaults. |
| [Function Inventory](function-inventory.md) | Detailed inventory of current UI features and core logic. |

## Trust, Privacy, and Release Docs

| Page | Purpose |
|---|---|
| [Privacy](privacy.md) | Local-first data behavior and AI data flow. |
| [Security Model](security-model.md) | Security assumptions and boundaries. |
| [Security Policy](../SECURITY.md) | Vulnerability reporting and support scope. |
| [License](license.md) | AGPL explanation in plain language. |
| [Manual QA](manual-qa.md) | Step-by-step release validation. |
| [Release Guide](release.md) | Release preparation and desktop build notes. |
| [Roadmap](roadmap.md) | Practical alpha roadmap and planned improvements. |
| [Final Alpha Summary](final-alpha-summary.md) | Current readiness summary and honest limitations. |

## Assets and Public Presentation

| Folder/page | Purpose |
|---|---|
| [Assets](assets/README.md) | Asset structure overview. |
| [Branding](assets/branding/README.md) | Logo/banner/icon placeholders and replacement notes. |
| [Screenshots](screenshots.md) | Screenshot capture process. |
| [Screenshot Assets](assets/screenshots/README.md) | Screenshot naming convention. |
| [Demo Assets](assets/demo/README.md) | Demo GIF/recording notes. |
| [Diagrams](assets/diagrams/README.md) | Diagram storage and Mermaid guidance. |
| [Showcase](showcase.md) | Public showcase copy and visual ordering. |
| [Investor Demo](investor-demo.md) | Investor/demo narrative. |
| [Pitch](pitch.md) | Early alpha pitch material. |
| [Product Brief](product-brief.md) | Product summary and positioning. |

## Documentation Rules

- Keep commands aligned with root `package.json`.
- Do not document roadmap ideas as implemented features.
- Mark experimental features explicitly.
- Link to a deeper page instead of duplicating long explanations.
- Update docs when behavior, setup, privacy, file formats, or extension contracts change.

## Next Steps

- First-time user: [Quickstart](quickstart.md)
- Contributor: [Contributor Guide](contributor-guide.md)
- Maintainer: [Manual QA](manual-qa.md)
- Public release reviewer: [Final Alpha Summary](final-alpha-summary.md)

