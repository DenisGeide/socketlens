# Troubleshooting

Use this guide for common setup and runtime problems in SocketLens alpha.

Run commands from the repository root.

## Install Fails

Check versions:

```bash
node -v
npm -v
```

Required:

- Node.js `20.19.0+` on the 20.x line, or `22.12.0+`
- npm `10+`

Then run:

```bash
npm install
```

If it still fails:

- confirm you are in the repository root,
- do not mix package managers; SocketLens uses npm and `package-lock.json`,
- use `npm ci` to verify the committed lockfile exactly,
- restart the terminal after installing Node.

The launchers also run `npm install` automatically when `node_modules` is missing:

```bat
launchers\start-web.bat
```

```bash
sh ./launchers/start-web.sh
```

If automatic install fails, read the npm error in that launcher window and rerun `npm install` manually from the repository root.

## Port 1420 Is Already In Use

`npm run dev` starts Vite on `127.0.0.1:1420`.

Fix:

- close the browser/dev terminal already running SocketLens,
- stop the old Node/Vite process,
- then run `npm run dev` again.

On Windows PowerShell:

```powershell
netstat -ano | findstr :1420
```

Then stop the process by PID:

```powershell
Stop-Process -Id <PID>
```

Replace `<PID>` with the numeric process id from `netstat`.

## App Will Not Open

Start web mode:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:1420
```

If the page is blank:

- confirm `npm install` completed,
- confirm the dev terminal is still running,
- check the terminal for Vite errors,
- reload after Vite reports ready.

## Echo Server Not Running

Start it in a second terminal:

```bash
npm run dev:echo
```

Expected URL:

```text
ws://127.0.0.1:17787
```

If Direct Mode cannot connect:

- keep the echo-server terminal open,
- use `ws://`, not `http://`,
- verify no local firewall blocks localhost,
- reconnect after the server says it is listening.

## App Will Not Connect

Direct Mode connects SocketLens itself to a WebSocket endpoint.

Check:

- URL starts with `ws://` or `wss://`,
- URL has a host,
- URL has no fragment like `#debug`,
- target server is running,
- filters are not hiding packets after connect.

Use the echo server first to separate SocketLens issues from target-server issues.

## Invalid WebSocket URL

Valid examples:

```text
ws://127.0.0.1:17787
wss://example.com/socket
```

Invalid examples:

```text
http://127.0.0.1:17787
localhost:17787
```

Fix the scheme and try again.

## Desktop Mode Fails

Desktop mode needs Rust/Cargo and Tauri platform prerequisites.

Check:

```bash
rustc --version
cargo --version
```

If missing:

- install Rust with `rustup`,
- on Windows use the MSVC toolchain,
- install platform prerequisites from the Tauri docs,
- use browser mode with `npm run dev` until native setup is ready.

## Tauri Backend Unavailable

This is expected in browser mode for native-only features.

Native-only features include:

- Proxy Mode local listener,
- native file dialogs,
- desktop packaging behavior.

Use:

```bash
npm run dev:desktop
```

## Proxy Unavailable

Proxy Mode requires desktop/Tauri.

Checklist:

- run `npm run dev:desktop`,
- run `npm run dev:echo` for a local target,
- set target URL to `ws://127.0.0.1:17787`,
- start proxy from the app,
- connect an external client to the local proxy URL shown by SocketLens.

If no packets appear, confirm the external client connects to the local proxy URL, not directly to the target URL.

## Invalid JSON

Manual send has two modes:

- **JSON** validates before sending.
- **Raw text** sends the text as-is.

If JSON send fails:

- fix quotes, commas, and braces,
- click format after fixing,
- switch to Raw text if you intentionally want non-JSON.

The inspector will not crash on invalid JSON; use the **Raw** tab.

## I Sent A Message But Nothing Appeared

Check:

- connection status is connected,
- manual send is enabled,
- payload is not empty,
- JSON mode contains valid JSON,
- filters are not hiding packets,
- auto-scroll is not paused while you are viewing old packets.

Use **Clear filters** if unsure.

## Packets Disappear During Long Sessions

SocketLens enforces a packet retention limit to protect memory. The default is 10,000 packets.

When the limit is reached, the newest packets are kept and old packets are removed from memory.

Change the limit in Settings.

## Session Save/Load Differs In Browser Mode

This is expected.

- Browser mode uses JSON download/upload fallback.
- Desktop mode uses native file dialogs.

Use `npm run dev:desktop` to test native dialogs.

## Ollama Unavailable

AI is optional and disabled by default.

For Ollama:

- start Ollama locally,
- use `http://127.0.0.1:11434`,
- install or select a local model,
- validate provider settings.

SocketLens sends packet data to AI only after you explicitly click an AI action.

## Build Fails

Run checks separately to find the first failure:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For native build issues, also check:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Cargo must be installed for this command.

## Diagnostics Bundle

SocketLens includes a diagnostics panel in the left sidebar. Open **Diagnostics** or use the command palette action **Open Diagnostics**.

Use it when filing bugs or checking a broken setup. The panel shows:

- app version and platform info,
- Tauri backend status,
- active mode and environment,
- connection and proxy state,
- packet counters and retention limit,
- AI provider status.

Click **Copy diagnostics** to copy a JSON bundle or **Export** to download it.

The diagnostics bundle excludes packet payloads, environment variable values, provider secrets, and recent log messages by default. It includes redacted URLs and counters only, so it is safer to share in bug reports. Still review the JSON before posting it publicly.

## Still Stuck

Open an issue with:

- OS,
- Node and npm versions,
- whether you used `npm run dev` or `npm run dev:desktop`,
- exact command that failed,
- WebSocket URL shape with secrets removed,
- copied diagnostics bundle,
- relevant SocketLens log panel messages,
- screenshots for UI issues.
