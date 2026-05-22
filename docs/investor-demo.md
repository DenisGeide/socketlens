# Investor Demo

This guide is a practical walkthrough for showing SocketLens to investors, maintainers, early users, or contributors.

SocketLens is an early alpha open-source developer tool. The demo should be presented honestly: it shows runnable product workflows and offline demo traffic, not production traction, paid usage, or a finished commercial platform.

## One-Sentence Pitch

SocketLens is a local-first desktop debugger that makes WebSocket traffic visible, searchable, replayable, and easier to understand for developers building realtime applications.

## Problem

Realtime applications are difficult to debug because important behavior happens outside normal request/response flows.

- Browser devtools can show frames, but they are not designed as a full debugging workspace.
- Realtime bugs often span auth, heartbeats, retries, subscriptions, notifications, and user actions.
- Teams need to inspect payloads, replay frames, save sessions, and reason about event flow without building custom internal tooling.
- Proxying traffic from another client or app is awkward without a dedicated local tool.

## Target Users

- Frontend developers building chat, collaboration, notifications, dashboards, games, trading interfaces, or presence systems.
- Backend and platform engineers debugging WebSocket event contracts.
- QA engineers reproducing realtime state bugs.
- Developer relations and support engineers investigating customer-facing realtime issues.
- Open-source maintainers who need a local, inspectable WebSocket debugging workflow.

## Why Now

Realtime UX is becoming a default expectation across software: collaboration, live AI assistants, streaming updates, multiplayer-style interfaces, operational dashboards, and notification systems all rely on persistent event streams.

At the same time, the debugging experience is still fragmented. SocketLens is positioned as a focused desktop workspace for realtime traffic, with local-first privacy and an open-source distribution model.

## Demo Setup

Fastest path:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:1420
```

The UI opens in Russian by default. Switch to English from Settings -> Language if presenting in English.

For native proxy mode, use:

```bash
npm run dev:desktop
```

Proxy mode requires Rust, Cargo, and Tauri platform prerequisites.

## Product Demo Flow

### 1. Start With The Offline Investor Demo

Click **Start Investor Demo**.

Narrative:

- SocketLens can show a convincing realtime debugging workflow with no backend setup.
- The traffic is clearly labeled as demo traffic.
- Synthetic packets represent a realistic chat app flow: auth, chat messages, heartbeat, notifications, warning/error events, and replay.

What to point out:

- Guided explanation cards.
- Packet timeline updates live.
- Payload inspector updates when packets are selected.
- Demo reset returns the app to a clean state.
- Offline AI explanation appears as a demo example when AI is disabled.

### 2. Inspect Packets Like A Developer

Select several packets in the timeline.

Show:

- Direction indicators for inbound and outbound frames.
- Event names, timestamps, size, and status badges.
- Pretty JSON view.
- Raw payload view.
- Metadata view.
- Copy payload action.

Narrative:

SocketLens turns an event stream into a session you can read, inspect, and share locally.

### 3. Search And Filter

Use search and filters:

- Search `auth`, `chat`, or `error`.
- Toggle incoming/outgoing.
- Show JSON-only and errors-only filters.
- Hide ping/pong traffic.

Narrative:

Realtime sessions get noisy quickly. The goal is to make 10,000-packet sessions usable without turning the app into a generic log viewer.

### 4. Show Manual Send And Replay

If using Direct Mode with the echo server:

```bash
npm run dev:echo
```

Connect to:

```text
ws://127.0.0.1:17787
```

Then:

- Send a JSON frame.
- Select an outgoing packet.
- Load it into the composer.
- Edit and replay it.

Narrative:

The app is not only a viewer. It supports interactive debugging by sending and replaying frames while preserving a packet timeline.

### 5. Explain Direct Mode

Direct Mode means SocketLens opens the WebSocket connection itself.

Use this for:

- Local APIs.
- Development servers.
- Testing echo servers.
- Debugging a target endpoint directly from the app.

### 6. Explain Proxy Mode

Proxy Mode means another client connects through SocketLens.

Use this for:

- Observing traffic from another app.
- Debugging clients you cannot easily modify.
- Capturing both client-to-target and target-to-client frames through a local native listener.

Be honest:

- Proxy mode is an alpha native workflow.
- It should be tested in the Tauri desktop app, not browser development mode.
- Current MVP is focused on local development and localhost workflows.

### 7. Show Session Persistence

Show save/load or explain it briefly:

- Save a debug session to JSON.
- Load it later.
- Export packet-only JSON.

Narrative:

Session files make debugging repeatable. They also create a future path for sanitized bug reports and team workflows.

### 8. Close With Privacy

Make privacy explicit:

- Packets stay local by default.
- No telemetry by default.
- AI is disabled by default.
- AI sends selected data only when the user clicks an AI action.
- Session files are user-selected local JSON files.

## Technical Moat

SocketLens is early, so the moat is best described as an execution and architecture thesis rather than a proven business moat.

The intended technical differentiation:

- Local-first desktop architecture for sensitive realtime traffic.
- Shared packet/session model across demo, direct, proxy, replay, persistence, and AI features.
- Native Rust proxy path for workflows that browser-only tools cannot handle cleanly.
- High-volume packet timeline design with batching, retention limits, and virtualized rendering.
- Defensive payload inspection for malformed JSON, large payloads, and mixed text/binary-safe traffic.
- Open-source transparency around privacy, local files, AI behavior, and security model.

## Open-Source Strategy

SocketLens should earn trust by being useful before it asks for payment.

- AGPL-licensed open-source core intended to keep modified/distributed versions open.
- Runnable examples for quick adoption.
- Clear docs for contributors.
- No hidden telemetry or hosted ingestion by default.
- Community-driven protocol examples and inspector ideas.
- Public roadmap and issue templates.

## Monetization Options

No revenue is claimed today.

Possible future options, after open-source adoption and stable usage:

- Paid desktop Pro features for advanced workflows.
- Team features for shared sanitized sessions or collections.
- Enterprise support and security review packages.
- Hosted collaboration or artifact storage that remains opt-in.
- Sponsorships or paid priority development for protocol integrations.

The open-source local debugger should remain useful without paid infrastructure.

## Roadmap

Near-term alpha priorities:

- Validate native builds on Windows, macOS, and Linux.
- Publish first downloadable release artifacts.
- Add final screenshots and a short demo recording.
- Harden proxy-mode failure cases.
- Improve session schema versioning and import validation.
- Add more automated smoke tests for demo and direct mode.

Later:

- Better connection profiles.
- Protocol-aware inspectors.
- Redaction tools for safer sharing.
- Authentication helpers.
- Plugin hooks for custom realtime protocols.

## Risks

- Browser devtools are free and already available, so SocketLens must be meaningfully better for repeated workflows.
- Proxy mode has cross-platform native complexity.
- WebSocket payloads may contain sensitive data, so privacy mistakes would be costly.
- AI features can create trust issues if they feel automatic or unclear.
- Open-source adoption is not guaranteed.
- Packaging, signing, and distribution are still alpha-stage work.

## Next Milestones

- Run full CI on GitHub for a clean public repository.
- Validate Tauri native builds on all release platforms.
- Publish an unsigned alpha release with clear warnings.
- Record the Investor Demo flow.
- Add issue labels and a first set of contributor-friendly tasks.
- Gather early developer feedback without claiming traction prematurely.
