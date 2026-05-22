# Final Manual QA Checklist

Use this checklist before public alpha releases, after large UI changes, or when validating a fresh clone.

Record every item as:

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Run commands from the repository root.

## 0. Test Environment

Record the environment before testing:

```text
QA date:
OS:
Node version:
npm version:
Rust/Cargo version:
Browser:
Desktop/Tauri tested: [ ] Yes  [ ] No
```

Expected result:

- Node matches `package.json` engines: `20.19.0+` on Node 20 or `22.12.0+`.
- npm is `10+`.
- Rust/Cargo is available if desktop/proxy/release build is tested.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 1. Fresh Install

```bash
npm install
```

Expected result:

- dependencies install without resolution errors,
- `node_modules` exists,
- `package-lock.json` remains the lockfile,
- no manual package-manager switching is required.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 2. One-Click Launchers

Windows:

```bat
launchers\start-web.bat
launchers\start-echo-server.bat
```

macOS/Linux:

```bash
sh ./launchers/start-web.sh
sh ./launchers/start-echo-server.sh
```

Expected result:

- launcher prints SocketLens title/status,
- if `node_modules` is missing, it runs `npm install` or clearly explains what is needed,
- web launcher starts `npm run dev`,
- echo launcher starts `npm run dev:echo`.

Desktop launcher:

```bat
launchers\start-desktop.bat
```

```bash
sh ./launchers/start-desktop.sh
```

Expected result:

- starts `npm run dev:desktop`,
- if Rust/Cargo/Tauri prerequisites are missing, the error is understandable.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 3. Automated Checks

```bash
npm run check
npm run release:prepare
```

Expected result:

- clean, encoding check, lint, typecheck, tests, build, and final clean pass,
- release metadata validation passes,
- no broken Cyrillic encoding is reported.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Native backend check, if Cargo is available:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected result: Rust backend compiles without errors. Warnings should be reviewed before release notes are finalized.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 4. Web Startup

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:1420
```

Expected result:

- SocketLens loads without a blank screen,
- top bar, sidebar, timeline, inspector, and logs are visible,
- Russian is the default UI language on a clean profile,
- browser mode clearly marks native-only proxy features as unavailable or limited.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 5. First-Run Onboarding

Start from a clean browser profile or clear app storage for SocketLens.

Expected result:

- onboarding/welcome content is visible but does not permanently dominate the workspace,
- "Try SocketLens in 2 minutes" explains Demo, Direct, Proxy, Replay, and Inspector at a glance,
- onboarding can be dismissed,
- progress persists after reload,
- onboarding can be restarted from Settings/Help.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 6. Investor Demo Mode

Click **Start Investor Demo** / **Запустить демо**.

Expected result:

- demo starts without any server,
- packets appear in the timeline,
- traffic is clearly marked as simulated/demo,
- auth, chat, presence, notification, heartbeat, reconnect, error, AI-like stream, and replay example packets appear,
- selected packets open in the inspector,
- Pretty, Raw, and Metadata tabs work.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Click reset demo.

Expected result:

- demo packets clear or return to a calm state,
- the app remains usable,
- no duplicate demo timers keep adding packets.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 7. Echo Server

In a second terminal:

```bash
npm run dev:echo
```

Expected result:

```text
ws://127.0.0.1:17787
```

The server prints startup status and keeps running.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 8. Direct Mode

Connect Direct Mode to:

```text
ws://127.0.0.1:17787
```

Expected result:

- status becomes connected,
- a welcome/server packet appears,
- diagnostics show the endpoint,
- manual send controls are enabled.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Send:

```json
{ "command": "ping" }
```

Expected result:

- outbound ping appears,
- inbound echo appears,
- `command.pong` appears,
- inspector works for each packet.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Disconnect.

Expected result:

- status changes to disconnected,
- send/replay actions become unavailable,
- no new packets appear after disconnect.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 9. Manual Send And Replay

While connected to the echo server:

1. Send the ping example.
2. Select the previous outgoing packet.
3. Edit the payload.
4. Replay the packet.
5. Replay the last packet from history.

Expected result:

- replay is enabled only while connected,
- a new outbound packet appears for replay,
- response packets appear from the echo server,
- replay history records the action,
- disconnected state blocks replay with a clear message.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 10. Filters And Search

Search for:

```text
ping
```

Expected result: result count updates and clearing search restores all packets.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Toggle:

- Incoming,
- Outgoing,
- JSON only,
- Errors only,
- Hide heartbeat,
- Hide ping/pong.

Expected result: each filter updates the timeline without broken empty states.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Test smart filter:

```text
payload.command == "ping"
```

Expected result: matching packets remain visible.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Test invalid smart filter:

```text
payload.command ===
```

Expected result: SocketLens shows a clear validation error and does not crash.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Save a filter preset and mark it as favorite.

Expected result: preset remains available locally after reload.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 11. Packet Inspector

Select JSON, text, error, and replay packets.

Expected result:

- Pretty JSON formats valid JSON,
- Raw keeps original payload content,
- Metadata shows event, direction, timestamp, size, connection id, session id, packet id,
- invalid JSON falls back safely,
- copy payload works,
- large payloads remain scrollable.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 12. Bookmarks, Tags, And Notes

Select a packet and:

1. bookmark it,
2. add a tag,
3. add a note,
4. mark it suspicious.

Expected result:

- timeline marker updates without clutter,
- inspector shows annotations,
- annotations persist when the session is saved and imported.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 13. Sessions, Export, And Redaction

With packets in the current session, open the Session Files panel.

Expected result in browser mode:

- save downloads a `.socketlens-session.json` file,
- export downloads packet JSON,
- AsyncAPI draft export is clearly marked experimental,
- load imports a saved SocketLens session or packet export.

Expected result in desktop mode:

- native file dialogs are used.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Redaction check:

1. Send a payload containing a token-like value.
2. Open Session Files.
3. Keep redaction enabled.
4. Preview/export.

Expected result:

- sensitive-looking values are replaced in the exported copy,
- payload structure is preserved where possible,
- the active in-app session is not mutated,
- disabling redaction with sensitive-looking data asks for explicit confirmation.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Corrupted import:

1. Create or choose a non-SocketLens JSON file.
2. Import it.

Expected result: import is rejected with a friendly error.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 14. Environments

Open the environment manager.

Expected result:

- Local, Staging, and Production presets exist,
- variables can be created, edited, duplicated, and deleted,
- connection profiles can use variables.

Test interpolation:

```text
{{base_url}}?token={{auth_token}}
```

Expected result:

- resolved WebSocket URL is validated,
- secret values are not printed in logs,
- import/export works locally,
- exported environment JSON is treated as sensitive because it may contain values.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 15. Socket.IO Demo

Start the Socket.IO demo:

```bash
npm run dev:socketio
```

Connect Direct Mode to:

```text
ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

Send:

```text
40/chat,
```

Then send:

```text
42/chat,1["chat.message",{"text":"Hello from SocketLens","room":"launch"}]
```

Expected result:

- packet is labeled as Socket.IO,
- namespace `/chat` is visible,
- event name `chat.message` is visible,
- acknowledgement id `1` is visible,
- Raw view keeps the original frame.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 16. Proxy Mode

Browser mode check:

```bash
npm run dev
```

Expected result: Proxy Mode explains that native proxy capture requires desktop/Tauri.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Desktop check:

```bash
npm run dev:desktop
```

Expected result:

- Tauri opens,
- proxy controls are available,
- backend status is visible.

If Rust/Cargo or Tauri prerequisites are missing, mark this as skipped with environment notes.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

With `npm run dev:echo` running, start proxy target:

```text
ws://127.0.0.1:17787
```

Expected result:

- proxy status becomes running,
- local proxy URL is visible,
- target URL is visible,
- connection count starts at zero.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Connect an external client to the local proxy URL:

```bash
node -e "const WebSocket = require('ws'); const ws = new WebSocket('PASTE_PROXY_URL_HERE'); ws.on('open', () => ws.send(JSON.stringify({ command: 'ping', source: 'manual-proxy-test' }))); ws.on('message', (data) => { console.log(data.toString()); ws.close(); }); ws.on('error', (error) => { console.error(error.message); process.exitCode = 1; });"
```

Expected result:

- outbound and inbound proxy packets appear in SocketLens,
- proxy logs record client connection/close,
- stopping proxy cleans up state.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 17. Diagnostics

Open Diagnostics and copy/export diagnostics.

Expected result:

- app version is visible,
- platform/runtime information is visible,
- active mode, environment, connection status, proxy status, counters, memory limit, and AI status are included,
- sensitive payload data is excluded by default.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 18. i18n

Open Settings and switch to **English**.

Expected result:

- UI changes immediately,
- no reload is required,
- packet payloads, raw JSON, URLs, logs from captured traffic, and user-entered values are not translated.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Switch back to **Русский**.

Expected result:

- Russian UI returns,
- setting persists after reload,
- no mojibake or garbled Cyrillic appears.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 19. Settings Persistence

Change:

- theme,
- compact mode,
- auto-scroll default,
- packet retention limit,
- default mode,
- payload preview privacy option.

Reload the app.

Expected result: settings persist and controls reflect saved values.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 20. AI Disabled And Provider Errors

Open Settings -> AI Provider.

Expected result:

- AI is disabled by default on a clean profile,
- privacy copy is visible,
- SocketLens works without AI.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Select a packet and click **Explain selected packet**.

Expected result:

- if AI is disabled, SocketLens shows a provider-not-configured state,
- no packet data is sent automatically,
- Investor Demo may show an offline sample explanation clearly marked as demo.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Configure Ollama with an unavailable URL and validate.

Expected result: provider unavailable error is human-readable and actionable.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 21. Error Handling

Invalid URL:

```text
http://127.0.0.1:17787
```

Expected result: SocketLens rejects it with a friendly validation message.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Echo server unavailable:

1. Stop `npm run dev:echo`.
2. Connect to `ws://127.0.0.1:17787`.

Expected result: connection fails gracefully and suggests checking the server.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Invalid JSON:

```json
{ "command": "ping",
```

Expected result: JSON mode blocks send or shows a validation error, while Raw text mode remains available.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Server disconnect:

1. Connect to echo server.
2. Stop the echo-server terminal.

Expected result: SocketLens changes to disconnected/error state and does not enter an infinite reconnect loop.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 22. Docs And README

Verify public docs:

- [README.md](../README.md)
- [docs/getting-started.md](getting-started.md)
- [docs/troubleshooting.md](troubleshooting.md)
- [docs/project-structure.md](project-structure.md)
- [docs/architecture.md](architecture.md)
- [docs/extension-points.md](extension-points.md)
- [docs/contributor-guide.md](contributor-guide.md)
- [docs/privacy.md](privacy.md)
- [docs/security-model.md](security-model.md)

Expected result:

- commands match `package.json`,
- links resolve,
- alpha limitations are visible,
- no fake production claims,
- no broken Cyrillic encoding,
- contributor extension points are understandable.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 23. Release Readiness Sign-Off

Final required command:

```bash
npm run check
```

Optional native release build, if the platform has the Tauri toolchain:

```bash
npm run release:build
```

Expected result:

- full source check passes,
- native build either passes or is explicitly skipped with environment notes,
- known limitations are documented in release notes.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Final sign-off:

```text
Release candidate:
QA owner:
Source alpha ready: [ ] Yes  [ ] No
Native artifacts ready: [ ] Yes  [ ] No  [ ] Not part of this release
Known failures:
Release blocking: [ ] Yes  [ ] No
```
