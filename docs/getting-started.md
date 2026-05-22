# Getting Started

This guide takes a fresh clone to a working SocketLens workspace.

SocketLens starts in Russian by default. Switch to English in **Settings -> Language**. UI text is translated; packet payloads, URLs, logs from captured traffic, and session files are not translated.

## Prerequisites

Browser mode:

- Node.js `20.19.0+` on the 20.x line, or `22.12.0+`
- npm `10+`
- a modern browser

Desktop mode and Proxy Mode also need:

- Rust `1.77.2+`
- Cargo
- Tauri OS prerequisites

Check your tools:

```bash
node -v
npm -v
rustc --version
cargo --version
```

Rust/Cargo can be missing if you only use browser mode, Demo Mode, Direct Mode, or the echo server.

## Install

From the repository root:

```bash
npm install
```

Expected result: npm installs all workspaces using `package-lock.json`.

For exact lockfile verification in CI or a fresh release check:

```bash
npm ci
```

## Start Web Mode

```bash
npm run dev
```

Expected result: Vite starts SocketLens at:

```text
http://127.0.0.1:1420
```

Use web mode for first-run onboarding, Demo Mode, Direct Mode, settings, sessions, search/filtering, and most frontend work.

## Try SocketLens In 2 Minutes

1. Open `http://127.0.0.1:1420`.
2. Click **Start Investor Demo** or **Start demo**.
3. Watch packets appear in the timeline.
4. Select a packet.
5. Inspect **Pretty**, **Raw**, and **Metadata** in the right panel.

Expected result: simulated demo packets appear live and are clearly marked as demo traffic.

You can hide the first-run guide and demo cards at any time. SocketLens remembers hidden cards after reloads. To restore all onboarding/demo cards and reset the guide progress, open **Settings** and click **Restart guide**.

## Start The Echo Server

Open a second terminal:

```bash
npm run dev:echo
```

Expected result: the local WebSocket echo server listens on:

```text
ws://127.0.0.1:17787
```

Useful commands it understands:

```json
{ "command": "ping" }
{ "command": "time" }
{ "command": "clients" }
{ "command": "broadcast", "message": "Hello from SocketLens" }
{ "command": "help" }
```

## Test Direct Mode

Direct Mode means SocketLens creates the WebSocket connection itself.

1. Keep `npm run dev` running.
2. Keep `npm run dev:echo` running.
3. Connect Direct Mode to:

```text
ws://127.0.0.1:17787
```

4. Send:

```json
{ "command": "ping" }
```

Expected result: the timeline shows the outbound ping, an echo response, and a `command.pong` response.

## Test Replay

1. Send the ping payload above.
2. Select the previous outgoing packet in the manual send/replay panel.
3. Click replay.

Expected result: SocketLens sends the packet again and records the replay in the timeline/history.

## Test Smart Filters

After demo or direct traffic appears in the timeline, use the filter controls above the packet list:

- text search: search payload text, event names, and direction labels
- regex search: toggle **Regex** and enter a regular expression
- event filter: enter an event fragment such as `chat.message`
- smart filter: enter JSON-path-like expressions against payload data
- presets: click **Save filter** to store the current filter locally, then star favorites

Supported smart filter examples:

```text
payload.type != "heartbeat"
payload.event == "chat.message"
payload.user.id == "123"
```

Expected result: matching packets remain visible, invalid regex/smart filters show a clear error, and malformed JSON payloads do not crash the timeline.

## Test Realtime Grouping

Packet grouping is enabled by default to keep noisy streams readable. It groups adjacent repeated events, heartbeat storms, reconnect flows, and auth flows without deleting the original packets.

1. Start Investor Demo or connect to the echo server.
2. Let several similar packets arrive.
3. Use the **Grouping** toggle in the packet timeline header.
4. Expand a group row.

Expected result: collapsed groups reduce timeline noise, and expanding a group shows the original packets in their captured order.

## Test Desktop Mode

Desktop mode starts the Tauri app:

```bash
npm run dev:desktop
```

Expected result: a native SocketLens window opens. Desktop mode is required for native Proxy Mode and native file dialogs.

If this fails, confirm Rust/Cargo and Tauri prerequisites are installed. Web mode can still be used without Rust.

## Test Proxy Mode

Proxy Mode means another client connects through SocketLens.

1. Run the echo server:

```bash
npm run dev:echo
```

2. Run the desktop app:

```bash
npm run dev:desktop
```

3. In SocketLens, switch capture mode to Proxy.
4. Set target URL to:

```text
ws://127.0.0.1:17787
```

5. Start the proxy.
6. Copy the local proxy URL.
7. Connect an external WebSocket client to that local proxy URL.

Expected result: traffic is forwarded to the echo server and captured in the timeline.

Browser mode cannot start the Rust proxy. Use desktop mode for Proxy Mode.

## One-click Launch Files

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

The start scripts check for `node_modules`. If dependencies are missing, they automatically run `npm install` before launching. Node.js/npm must still be installed first. Desktop mode also requires Rust/Cargo and Tauri platform prerequisites.

On Windows, `launchers\generate-shortcuts.bat` creates optional desktop shortcuts for Web, Desktop, and Echo Server launchers.

## Validate The Repo

Run focused checks:

```bash
npm run typecheck
npm run test
npm run build
```

Run the full local pipeline:

```bash
npm run check
```

Expected result: encoding check, lint, typecheck, tests, and builds pass.

## More Detail

- [Project structure](project-structure.md)
- [Development guide](development.md)
- [Manual QA checklist](manual-qa.md)
- [Troubleshooting](troubleshooting.md)
- [Direct Mode](direct-mode.md)
- [Proxy Mode](proxy-mode.md)
- [Sessions](sessions.md)
