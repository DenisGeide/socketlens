# Manual QA Checklist

Use this checklist before alpha releases, after larger UI changes, or when verifying a fresh clone.

Record each item as:

```text
[ ] Pass  [ ] Fail  Notes:
```

Run commands from the repository root.

## 1. Install

```bash
npm install
```

Expected result:

- dependencies install without resolution errors,
- `node_modules` exists,
- `package-lock.json` is the lockfile in use.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 2. Static Checks

```bash
npm run lint
npm run typecheck
npm run test
```

Expected result: lint, TypeScript, and unit tests pass.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 3. Web Startup

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
- native-only proxy features are shown as unavailable in browser mode.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 4. Demo Mode

Click **Start Investor Demo** or **Запустить демо**.

Expected result:

- demo starts without a server,
- packets appear in the timeline,
- demo packets are clearly marked as simulated,
- selected packets open in the inspector,
- **Pretty**, **Raw**, and **Metadata** tabs work.

```text
[ ] Pass  [ ] Fail  Notes:
```

Reset demo.

Expected result: demo state clears and the app remains usable.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 5. Echo Server

In a second terminal:

```bash
npm run dev:echo
```

Expected result: the server listens on:

```text
ws://127.0.0.1:17787
```

```text
[ ] Pass  [ ] Fail  Notes:
```

## 6. Direct Mode

Connect Direct Mode to:

```text
ws://127.0.0.1:17787
```

Expected result:

- status becomes connected,
- a welcome/server packet appears,
- diagnostics show the endpoint,
- the manual send panel is enabled.

```text
[ ] Pass  [ ] Fail  Notes:
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
[ ] Pass  [ ] Fail  Notes:
```

## 7. Replay

Replay the previous outgoing ping packet.

Expected result:

- replay is enabled only while connected,
- a new outbound packet appears,
- a new response appears,
- replay history records the action.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 8. Filters And Search

Search for:

```text
ping
```

Expected result: result count updates and clearing search restores all packets.

```text
[ ] Pass  [ ] Fail  Notes:
```

Toggle:

- Incoming,
- Outgoing,
- JSON only,
- Errors only,
- Hide ping/pong.

Expected result: each filter updates the timeline without broken empty states.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 9. Session Save And Load

With packets in the current session, use the session file panel.

Expected result in browser mode:

- save downloads a `.socketlens-session.json` file,
- export downloads packet JSON,
- load imports a saved SocketLens session or packet export.

Expected result in desktop mode:

- native file dialogs are used.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 10. i18n

Open Settings and switch to **English**.

Expected result:

- UI changes immediately,
- no reload is required,
- packet payloads, raw JSON, URLs, and user-entered values are not translated.

```text
[ ] Pass  [ ] Fail  Notes:
```

Switch back to **Русский**.

Expected result: Russian UI returns and persists after reload.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 11. Settings Persistence

Change:

- theme,
- compact mode,
- auto-scroll default,
- packet retention limit,
- payload preview privacy option.

Reload the app.

Expected result: settings persist and controls reflect saved values.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 12. AI Disabled State

Open Settings -> AI provider.

Expected result:

- AI is disabled by default on a clean profile,
- privacy copy is visible,
- SocketLens works without AI.

```text
[ ] Pass  [ ] Fail  Notes:
```

Select a packet and click **Explain selected packet**.

Expected result:

- if AI is disabled, SocketLens shows a provider-not-configured state,
- no packet data is sent automatically,
- Investor Demo may show an offline sample explanation clearly marked as demo.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 13. Proxy Mode

Browser mode check:

```bash
npm run dev
```

Expected result: Proxy Mode explains that the native backend requires desktop/Tauri.

```text
[ ] Pass  [ ] Fail  Notes:
```

Desktop check:

```bash
npm run dev:desktop
```

Expected result: Tauri opens and proxy controls are available.

If Rust/Cargo or Tauri prerequisites are missing, mark this as an environment limitation.

```text
[ ] Pass  [ ] Fail  Notes:
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
[ ] Pass  [ ] Fail  Notes:
```

Connect an external client to the local proxy URL:

```bash
node -e "const WebSocket = require('ws'); const ws = new WebSocket('PASTE_PROXY_URL_HERE'); ws.on('open', () => ws.send(JSON.stringify({ command: 'ping' }))); ws.on('message', (data) => { console.log(data.toString()); ws.close(); }); ws.on('error', (error) => { console.error(error.message); process.exitCode = 1; });"
```

Expected result: forwarded outbound and inbound packets appear in SocketLens.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 14. Error Handling

Invalid URL:

```text
http://127.0.0.1:17787
```

Expected result: SocketLens rejects it with a friendly message.

```text
[ ] Pass  [ ] Fail  Notes:
```

Echo server unavailable:

1. Stop `npm run dev:echo`.
2. Connect to `ws://127.0.0.1:17787`.

Expected result: connection fails gracefully and suggests checking the server.

```text
[ ] Pass  [ ] Fail  Notes:
```

Invalid JSON:

```json
{ "command": "ping",
```

Expected result: JSON mode blocks send, Raw text mode remains available.

```text
[ ] Pass  [ ] Fail  Notes:
```

Server disconnect:

1. Connect to echo server.
2. Stop the echo-server terminal.

Expected result: SocketLens changes to disconnected/error state and does not enter an infinite reconnect loop.

```text
[ ] Pass  [ ] Fail  Notes:
```

## 15. Build

```bash
npm run build
```

Expected result: all buildable workspaces compile.

```text
[ ] Pass  [ ] Fail  Notes:
```

Full pipeline:

```bash
npm run check
```

Expected result: clean, encoding check, lint, typecheck, tests, build, and final clean all pass.

```text
[ ] Pass  [ ] Fail  Notes:
```

## Sign-off

```text
QA date:
OS:
Node version:
npm version:
Browser mode verified: [ ] Yes  [ ] No
Desktop/Tauri mode verified: [ ] Yes  [ ] No  [ ] Skipped, environment missing
Known failures:
Release blocking: [ ] Yes  [ ] No
Reviewer:
```
