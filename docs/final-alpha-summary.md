# Final Alpha Summary

Purpose: give maintainers, contributors, and public visitors an honest snapshot of SocketLens `v1.0.0-alpha` readiness.

## What SocketLens Is

SocketLens is a local-first WebSocket debugging workspace for developers building realtime applications.

It is designed to make WebSocket traffic easier to inspect than a raw browser DevTools frame table:

- packets appear in a dedicated timeline;
- payloads can be inspected as Pretty JSON, Raw text, and Metadata;
- noisy streams can be searched, filtered, grouped, and replayed;
- sessions can be saved, imported, exported, and redacted before sharing;
- protocol understanding can be extended through decoders, analyzers, filters, exporters, and AI providers.

## Current Position

SocketLens is a usable open-source alpha for:

- local development;
- demos;
- direct WebSocket debugging;
- local echo-server testing;
- native proxy MVP testing;
- contributor extension work.

It is not a finished commercial product and should not be marketed as stable production software.

## What Works In This Alpha

- **Demo Mode**: simulated offline auth, chat, presence, notification, heartbeat, reconnect, error, streaming, and replay examples.
- **Direct Mode**: connect to `ws://` or `wss://` endpoints from inside SocketLens.
- **Echo Server**: local Node.js WebSocket server at `ws://127.0.0.1:17787`.
- **Proxy Mode**: native Tauri/Rust MVP that exposes a local proxy URL and forwards frames to a target WebSocket server.
- **Packet Timeline**: direction badges, event names, timestamps, size, preview, search, filters, grouping, counters, pause/follow behavior, and clear confirmation.
- **Payload Inspector**: Pretty, Raw, Metadata, copy, and large payload view.
- **Manual Send and Replay**: send JSON/raw text, edit payloads, replay outgoing packets, replay sequences, delay controls, and replay history.
- **Sessions**: save/load session JSON, import/export packets, and keep session metadata.
- **Redaction**: best-effort export redaction for tokens, cookies, auth headers, sensitive query values, and custom rules.
- **Environments**: Local/Staging/Production variables, secret markers, interpolation, and connection profiles.
- **Diagnostics**: copy/export privacy-safe runtime diagnostics without packet payload bodies.
- **AI**: optional OpenAI-compatible and Ollama provider architecture, disabled by default and triggered only by explicit user action.
- **i18n**: Russian and English UI language support with persisted switching.
- **Extension Points**: source-level contracts for decoders, analyzers, filters, exporters, AI providers, plugins, and replay strategies.

## Current Alpha Limitations

- Desktop artifacts are unsigned.
- Proxy Mode requires the native Tauri app and remains an MVP for local debugging.
- Browser mode cannot open the Rust proxy listener.
- Protocol decoding is conservative and incomplete by design.
- Socket.IO and GraphQL WS support are initial decoders, not full protocol suites.
- AsyncAPI export is inferred and experimental; generated drafts require human review.
- Redaction is best-effort; exported files should be reviewed before sharing.
- AI is optional, provider-dependent, and may be wrong.
- Provider keys are stored locally, not in an OS keychain yet.
- Binary protocol support for Protobuf, MessagePack, and BSON is foundation/roadmap work.
- No telemetry, hosted sync, cloud workspace, account system, billing, or paid service exists in this alpha.

## Run Locally

Install:

```bash
npm install
```

Start browser mode:

```bash
npm run dev
```

Expected result:

```text
http://127.0.0.1:1420/
```

Start the local echo server:

```bash
npm run dev:echo
```

Expected endpoint:

```text
ws://127.0.0.1:17787
```

Start desktop mode for native/Tauri features:

```bash
npm run dev:desktop
```

Desktop mode requires Rust/Cargo and platform Tauri prerequisites.

## Test The Main Workflows

### Demo Mode

1. Start SocketLens with `npm run dev`.
2. Click **Start Investor Demo**.
3. Verify packets appear in the timeline.
4. Select a packet.
5. Verify the inspector shows Pretty, Raw, and Metadata views.

Expected result: the app looks alive without connecting to a real backend, and all traffic is clearly demo/simulated.

### Direct Mode

1. Start SocketLens with `npm run dev`.
2. Start the echo server in another terminal:

   ```bash
   npm run dev:echo
   ```

3. Connect to:

   ```text
   ws://127.0.0.1:17787
   ```

4. Send:

   ```json
   { "command": "ping" }
   ```

Expected result: the timeline shows outbound and inbound packets, and the inspector shows the response payload.

### Proxy Mode

1. Start the echo server:

   ```bash
   npm run dev:echo
   ```

2. Start the native desktop app:

   ```bash
   npm run dev:desktop
   ```

3. In Proxy Mode, set the target URL to:

   ```text
   ws://127.0.0.1:17787
   ```

4. Start proxy.
5. Connect an external WebSocket client to the local proxy URL shown by SocketLens.

Expected result: forwarded frames appear in the timeline. If running browser mode, SocketLens should clearly say that the native backend is unavailable.

## How Contributors Can Extend It

SocketLens should be extended through focused modules instead of rewriting the core:

- add protocol logic through [Adding a Decoder](adding-a-decoder.md);
- add search/filter behavior through [Adding a Filter](adding-a-filter.md);
- add optional AI integrations through [Adding an AI Provider](adding-ai-provider.md);
- add export behavior through the `ExportAdapter` extension point;
- add UI panels inside `apps/desktop/src/components` while keeping domain logic in `models`, `lib`, or `extensions`;
- keep native behavior inside `apps/desktop/src-tauri`.

Start with:

- [Contributor Guide](contributor-guide.md)
- [Architecture](architecture.md)
- [Architecture Rules](architecture-rules.md)
- [Extension Points](extension-points.md)
- [Function Inventory](function-inventory.md)

## Release Readiness Checklist

- [ ] `npm run check` passes.
- [ ] `npm run release:prepare` passes.
- [ ] Web mode starts with `npm run dev`.
- [ ] Echo server starts with `npm run dev:echo`.
- [ ] Demo Mode works from a clean profile.
- [ ] Direct Mode connects to `ws://127.0.0.1:17787`.
- [ ] Manual send and replay work while connected.
- [ ] Session export/import and redaction work.
- [ ] Diagnostics export excludes sensitive payloads.
- [ ] Desktop mode starts with `npm run dev:desktop`.
- [ ] Proxy Mode is tested in desktop mode.
- [ ] README screenshot links render.
- [ ] Docs links are checked.
- [ ] Known limitations are visible and honest.

## Suggested Public Positioning

Use this wording:

> SocketLens is an open-source alpha WebSocket debugging workspace for local development, demos, and protocol tooling experiments.

Avoid:

- claiming production stability;
- claiming enterprise security/compliance;
- inventing users, revenue, or traction;
- presenting roadmap ideas as completed;
- describing optional AI as required for the product to be useful.

## Next Recommended Roadmap

Before expanding scope:

1. Validate native Tauri builds on Windows, macOS, and Linux.
2. Publish unsigned alpha artifacts only after CI/release workflow success.
3. Tighten Proxy Mode lifecycle and failure-case QA.
4. Add more fixture-backed decoder tests.
5. Improve session schema versioning and import validation.
6. Keep documentation and screenshots aligned with real implemented behavior.
7. Continue reducing setup friction for first-time contributors.

## Related

- [README](../README.md)
- [Documentation Index](README.md)
- [Installation](installation.md)
- [Quickstart](quickstart.md)
- [Manual QA](manual-qa.md)
- [Roadmap](roadmap.md)
- [Privacy](privacy.md)
- [Security Model](security-model.md)
- [Function Inventory](function-inventory.md)

## Next Steps

- New user: [Quickstart](quickstart.md)
- Contributor: [Contributor Guide](contributor-guide.md)
- Maintainer: [Manual QA](manual-qa.md)
