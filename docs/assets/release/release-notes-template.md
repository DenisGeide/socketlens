# SocketLens vX.Y.Z

SocketLens `vX.Y.Z` is an alpha release of the local-first WebSocket debugger.

## Status

- Maturity:
- Recommended audience:
- Download artifacts:
- Signing status:

## Highlights

- 

## Install

```bash
git clone https://github.com/socketlens/socketlens.git
cd socketlens
npm install
npm run dev
```

Expected result: SocketLens opens at `http://127.0.0.1:1420/`.

## Quick Demo

1. Start SocketLens with `npm run dev`.
2. Click **Start Investor Demo**.
3. Select a packet and inspect Pretty, Raw, and Metadata.
4. Start the echo server with `npm run dev:echo`.
5. Connect Direct Mode to `ws://127.0.0.1:17787`.
6. Send `{ "command": "ping" }`.

## Verification

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] `npm run release:prepare`
- [ ] `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- [ ] Investor Demo smoke test
- [ ] Direct Mode echo-server smoke test
- [ ] Proxy Mode native smoke test, if artifacts include desktop/proxy claims

## Known Limitations

- SocketLens is alpha software.
- Desktop artifacts are unsigned unless this release states otherwise.
- Proxy Mode requires the native Tauri app.
- AI is optional, disabled by default, and sends selected data only after a user action.

## Privacy

SocketLens has no telemetry by default. Packet data stays local unless the user connects to an endpoint, starts proxy forwarding, saves/exports/copies data, or explicitly runs an AI action against a configured provider.

## Assets

Recommended release thumbnail:

```text
docs/assets/release/socketlens-release-thumbnail.svg
```

Recommended screenshot folder:

```text
docs/assets/screenshots/
```
