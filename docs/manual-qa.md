# Manual QA Checklist

Use this checklist before public alpha releases, after large UI changes, or when validating SocketLens from a fresh clone.

Every scenario uses the same format:

- **Command / Action**: what to run or click.
- **Expected Result**: what should happen.
- **Common Failure**: what usually goes wrong.
- **Fix Suggestion**: what to try first.

Record each scenario as:

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

Run all commands from the repository root.

## 0. Test Environment

**Command / Action**

```bash
node -v
npm -v
cargo --version
```

Record:

```text
QA date:
OS:
Browser:
Desktop/Tauri tested: [ ] Yes  [ ] No
```

**Expected Result**

- Node.js matches `package.json`: Node `20.19.0+` on the 20.x line, or `22.12.0+`.
- npm is `10+`.
- Cargo is available if desktop mode, proxy mode, or native release builds are tested.

**Common Failure**

- `cargo` is not recognized.
- Node.js is older than the supported engine.

**Fix Suggestion**

- Install Rust from `https://rustup.rs/` for desktop/proxy testing.
- Install a supported Node.js version before running `npm install`.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 1. Install

**Command / Action**

```bash
npm install
```

**Expected Result**

- Dependencies install without resolution errors.
- `node_modules` exists.
- `package-lock.json` remains the lockfile.
- No package-manager switch is required.

**Common Failure**

- npm reports engine warnings or dependency resolution errors.
- User tries pnpm/yarn commands by mistake.

**Fix Suggestion**

- Use npm only.
- Upgrade Node.js/npm to the versions listed in `package.json`.
- Delete only generated install output if needed, then retry `npm install`.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 2. Automated Checks

**Command / Action**

```bash
npm run check
npm run release:prepare
```

Optional native backend check if Cargo is installed:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

**Expected Result**

- Encoding audit, lint, typecheck, tests, builds, and cleanup pass.
- Release metadata validation passes.
- Rust backend compiles when the native toolchain is available.

**Common Failure**

- Vite reports a build error.
- TypeScript fails because of a broken import.
- Cargo is missing on machines that only test web mode.

**Fix Suggestion**

- Fix TypeScript/build errors before continuing QA.
- Mark Cargo-only checks as skipped only when desktop/proxy are not part of the test environment.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 3. App Startup - Web Mode

**Command / Action**

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:1420
```

**Expected Result**

- SocketLens loads without a blank screen.
- Top bar, sidebar, packet timeline, payload inspector, and logs are visible.
- Browser mode clearly marks native-only proxy behavior as unavailable or limited.

**Common Failure**

- `Port 1420 is already in use`.
- Browser shows an old cached state.

**Fix Suggestion**

- Stop the previous Vite terminal or process that owns port `1420`.
- Hard refresh the browser or clear SocketLens local storage for first-run QA.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 4. App Startup - Desktop Mode

**Command / Action**

```bash
npm run dev:desktop
```

**Expected Result**

- Tauri opens the SocketLens desktop app.
- Direct Mode works.
- Native-only controls are available.
- Proxy Mode can access the Rust backend.

**Common Failure**

- Rust/Cargo or Tauri OS prerequisites are missing.
- The dev server on port `1420` is already running separately.

**Fix Suggestion**

- Install Rust/Cargo and Tauri prerequisites.
- Close any existing `npm run dev` session before starting desktop mode, because Tauri starts Vite through its `beforeDevCommand`.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 5. First-Run Onboarding

**Command / Action**

- Start from a clean browser profile or clear SocketLens local storage.
- Open SocketLens.
- Review the welcome/onboarding content.
- Dismiss onboarding.
- Restart onboarding from Settings/Help if available.

**Expected Result**

- A new user can understand Demo Mode, Direct Mode, Proxy Mode, Replay, and Payload Inspector quickly.
- Onboarding does not permanently dominate the workspace.
- Dismissed/progress state persists after reload.

**Common Failure**

- Onboarding is not visible on a clean profile.
- Dismissed state does not persist.

**Fix Suggestion**

- Clear local storage and retry.
- Check Settings/Help restart action if the first-run state was already completed.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 6. Demo Mode

**Command / Action**

- Click **Start Investor Demo**.
- Select several generated packets.
- Open Pretty, Raw, and Metadata tabs.
- Reset the demo.

**Expected Result**

- Demo starts without any server.
- Demo traffic is clearly marked as simulated.
- Timeline shows realistic auth, chat, presence, notification, heartbeat, reconnect, error, streaming AI-like, and replay-example packets.
- Inspector updates when a packet is selected.
- Reset stops the demo and prevents duplicate timers.

**Common Failure**

- No packets appear.
- Packets keep appearing after reset.
- Selected packet does not open in the inspector.

**Fix Suggestion**

- Click reset, reload the app, and start the demo once.
- Check filters are not hiding all packets.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 7. Echo Server

**Command / Action**

In a second terminal:

```bash
npm run dev:echo
```

**Expected Result**

- Echo server starts on `ws://127.0.0.1:17787`.
- Terminal stays open and prints server status.

**Common Failure**

- Port `17787` is already in use.
- Dependencies were not installed.

**Fix Suggestion**

- Stop the old echo-server terminal/process.
- Run `npm install` from the repository root.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 8. Direct Mode

**Command / Action**

- Start the app with `npm run dev` or `npm run dev:desktop`.
- Start the echo server with `npm run dev:echo`.
- Connect Direct Mode to:

```text
ws://127.0.0.1:17787
```

Send:

```json
{ "command": "ping" }
```

**Expected Result**

- Status becomes connected.
- A welcome/server packet appears.
- Manual send controls are enabled.
- Outbound ping, inbound echo, and `command.pong` packets appear.
- Disconnect changes status and disables send/replay actions.

**Common Failure**

- Invalid URL message.
- Connection refused.
- Send button remains disabled.

**Fix Suggestion**

- Use `ws://127.0.0.1:17787`, not `http://`.
- Confirm `npm run dev:echo` is still running.
- Disconnect and reconnect after changing the URL.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 9. Socket.IO Demo

**Command / Action**

Start the Socket.IO demo server:

```bash
npm run dev:socketio
```

Connect Direct Mode to:

```text
ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

Send namespace connect:

```text
40/chat,
```

Send an event:

```text
42/chat,1["chat.message",{"text":"Hello from SocketLens","room":"launch"}]
```

**Expected Result**

- Packets are labeled as Socket.IO.
- Namespace `/chat` is visible.
- Event name `chat.message` is visible.
- Acknowledgement id `1` is visible.
- Raw view keeps the original Socket.IO frame.

**Common Failure**

- Socket.IO packets show only as raw WebSocket frames.
- Server is not reachable.

**Fix Suggestion**

- Confirm `npm run dev:socketio` is running.
- Send `40/chat,` before sending the event frame.
- Verify the URL includes `EIO=4&transport=websocket`.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 10. Replay

**Command / Action**

- Connect to the echo server in Direct Mode.
- Send the ping example.
- Select the previous outgoing packet.
- Edit the payload.
- Replay the selected packet.
- Replay the last packet from replay history.
- Disconnect and try replay again.

**Expected Result**

- Replay is enabled only while connected.
- Edited replay creates a new outbound packet.
- Echo server returns response packets.
- Replay history records successful replay actions.
- Disconnected state blocks replay with a clear message.

**Common Failure**

- Replay button is disabled unexpectedly.
- Replay sends nothing silently.

**Fix Suggestion**

- Select an outgoing packet.
- Confirm the WebSocket connection is active.
- Fix invalid JSON or switch to Raw text before replaying.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 11. Filters

**Command / Action**

Search:

```text
ping
```

Toggle:

- Incoming
- Outgoing
- JSON only
- Errors only
- Hide heartbeat
- Hide ping/pong

Test smart filter:

```text
payload.command == "ping"
```

Test invalid smart filter:

```text
payload.command ===
```

**Expected Result**

- Search and chips update the result count.
- Clearing filters restores the timeline.
- Smart filter keeps matching packets visible.
- Invalid filters show a friendly validation error and do not crash the app.

**Common Failure**

- Timeline appears empty after testing filters.
- Invalid filter breaks search state.

**Fix Suggestion**

- Click clear filters.
- Disable errors-only/JSON-only if the current packets do not match.
- Reload only if the UI remains inconsistent after clearing filters.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 12. Grouping

**Command / Action**

- Start Demo Mode or a noisy Direct Mode session.
- Enable packet grouping if it is not already enabled.
- Inspect repeated heartbeat/chat/reconnect/auth groups.
- Expand and collapse a group.
- Turn grouping off.

**Expected Result**

- Repeated events can be grouped without deleting packets.
- Expanding a group shows original packets in order.
- Turning grouping off restores the normal packet list.
- Selection and inspector still work.

**Common Failure**

- No groups appear.
- Expanded group order looks wrong.

**Fix Suggestion**

- Generate more demo packets or wait for repeated echo/heartbeat traffic.
- Clear filters that may hide packets required for grouping.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 13. Environments

**Command / Action**

- Open the environment manager.
- Review Local, Staging, and Production presets.
- Create a variable.
- Duplicate and delete an environment.
- Test a connection URL template:

```text
{{base_url}}?token={{auth_token}}
```

- Import/export environments.

**Expected Result**

- Variables interpolate before connecting.
- Resolved WebSocket URLs are validated.
- Secret-like values are not printed in logs.
- Import/export is local-only.

**Common Failure**

- URL remains unresolved.
- Resolved URL is invalid.

**Fix Suggestion**

- Ensure `base_url` includes `ws://` or `wss://`.
- Ensure every `{{variable}}` exists in the active environment.
- Treat exported environment JSON as sensitive if it contains tokens.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 14. Session Export / Import

**Command / Action**

- Create packets through Demo Mode or Direct Mode.
- Open Session Files.
- Save a SocketLens session.
- Export packets.
- Import the saved session.
- Import a corrupted or unrelated JSON file.

**Expected Result**

- Session JSON can be saved and loaded later.
- Loaded packets appear in the timeline.
- Exported packet JSON is readable.
- Corrupted import is rejected with a friendly error.
- Browser mode uses downloads/uploads; desktop mode can use native dialogs.

**Common Failure**

- Browser blocks downloads.
- Imported file does not appear in the timeline.

**Fix Suggestion**

- Allow downloads for localhost.
- Confirm the file is a SocketLens session/export file.
- Use desktop mode if native file dialogs are required.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 15. Redaction

**Command / Action**

- Send or load a payload containing token-like values, for example:

```json
{ "authorization": "Bearer demo-secret-token", "cookie": "sessionid=demo" }
```

- Open Session Files.
- Keep redaction enabled.
- Preview/export redacted data.
- Verify the active in-app session remains unchanged.

**Expected Result**

- Exported copy redacts sensitive-looking values.
- Payload structure is preserved where possible.
- Original session is not mutated without confirmation.
- Disabling redaction for sensitive-looking data requires explicit confirmation.

**Common Failure**

- Token-like value appears in exported data.
- Redaction mutates active packet data.

**Fix Suggestion**

- Add a custom redaction rule for the missed field.
- Treat this as release-blocking if built-in token/cookie/header redaction fails.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 16. i18n

**Command / Action**

- Open Settings.
- Switch interface language to English.
- Switch back to Russian.
- Select a packet with JSON payload.

**Expected Result**

- UI language changes instantly without reload.
- Selected language persists after reload.
- Buttons, labels, settings, empty states, validation messages, and static UI copy are translated.
- Packet payloads, raw JSON, URLs, captured traffic logs, user-entered values, and session files are not translated.
- No mojibake or question-mark replacement appears in Russian UI.

**Common Failure**

- Some UI text stays in the previous language.
- Payload content is translated by mistake.
- Russian text renders as question marks or mojibake.

**Fix Suggestion**

- Check the translation key in `apps/desktop/src/i18n/locales`.
- Keep captured/user data outside the translation layer.
- Run `npm run encoding:check`.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 17. Settings Persistence

**Command / Action**

Change:

- theme,
- compact mode,
- auto-scroll default,
- packet retention limit,
- default mode,
- privacy toggles,
- language.

Reload the app.

**Expected Result**

- Settings persist locally.
- Controls reflect saved values after reload.
- Packet payloads/session files are not modified by UI settings.

**Common Failure**

- Settings reset on reload.
- Compact mode creates clipped UI.

**Fix Suggestion**

- Confirm local storage is enabled.
- Test again in a clean profile.
- Treat clipped layout at 100% zoom as a UI bug.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 18. Diagnostics

**Command / Action**

- Open Diagnostics.
- Copy diagnostics bundle.
- Export diagnostics if available.

**Expected Result**

- Diagnostics include app version, platform info, backend status, active mode, active environment, connection status, proxy status, packet counters, memory/packet limit info, and AI status.
- Sensitive payload content is excluded by default.

**Common Failure**

- Diagnostics include raw payload or tokens.
- Backend status is misleading in browser mode.

**Fix Suggestion**

- Treat sensitive diagnostics output as release-blocking.
- Browser mode should explicitly show native backend unavailable/limited instead of pretending proxy support is active.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 19. AI Disabled State

**Command / Action**

- Open Settings -> AI Provider on a clean profile.
- Confirm AI is disabled.
- Select a packet.
- Click Explain selected packet.
- Optionally configure an unavailable Ollama URL and validate.

**Expected Result**

- AI is disabled by default.
- Privacy copy is visible.
- SocketLens works fully without AI.
- No packet data is sent automatically.
- Explain action shows a provider-not-configured or provider-unavailable state.
- Provider errors are human-readable and actionable.

**Common Failure**

- AI appears enabled by default.
- Explain action sends data without a user click.
- Error only says `Failed to fetch`.

**Fix Suggestion**

- Reset AI settings and retest from clean storage.
- Improve provider error mapping before release.
- Verify packet data is sent only after an explicit user action.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 20. Proxy Mode

Run this only when the Tauri backend is available.

**Command / Action**

Start desktop mode:

```bash
npm run dev:desktop
```

Start echo server:

```bash
npm run dev:echo
```

Start proxy with target:

```text
ws://127.0.0.1:17787
```

Connect an external client to the local proxy URL shown by SocketLens:

```bash
node -e "const WebSocket = require('ws'); const ws = new WebSocket('PASTE_PROXY_URL_HERE'); ws.on('open', () => ws.send(JSON.stringify({ command: 'ping', source: 'manual-proxy-test' }))); ws.on('message', (data) => { console.log(data.toString()); ws.close(); }); ws.on('error', (error) => { console.error(error.message); process.exitCode = 1; });"
```

**Expected Result**

- Proxy status becomes running/live.
- Target URL and local proxy URL are visible.
- Connection count updates when the external client connects.
- Forwarded frames appear in the timeline.
- Proxy logs record start, client connection, close, and stop.
- Stopping proxy cleans up state.

**Common Failure**

- Proxy controls are unavailable in browser mode.
- External client connects to target URL instead of local proxy URL.
- No packets appear after proxy starts.

**Fix Suggestion**

- Use `npm run dev:desktop`; browser mode cannot run the Rust proxy.
- Copy the local proxy URL from SocketLens and use that URL in the external client.
- Confirm the target echo server is running.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 21. Error Handling

**Command / Action**

Test invalid URL:

```text
http://127.0.0.1:17787
```

Stop the echo server and connect to:

```text
ws://127.0.0.1:17787
```

Test invalid JSON in JSON send mode:

```json
{ "command": "ping",
```

**Expected Result**

- Invalid URLs are rejected with a friendly validation message.
- Connection failure suggests checking the server/URL.
- Invalid JSON does not crash the app.
- Raw text mode remains available.
- Server disconnect changes status without infinite reconnect loops.

**Common Failure**

- Raw stack trace appears in the UI.
- App keeps reconnecting forever.
- Duplicate packet listeners produce duplicate packets.

**Fix Suggestion**

- Treat raw stack traces and infinite reconnect loops as release-blocking.
- Restart the app and verify only one active connection/listener exists.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 22. Documentation Links

**Command / Action**

Open and skim:

- [README.md](../README.md)
- [docs/getting-started.md](getting-started.md)
- [docs/project-structure.md](project-structure.md)
- [docs/architecture.md](architecture.md)
- [docs/extension-points.md](extension-points.md)
- [docs/contributor-guide.md](contributor-guide.md)
- [docs/troubleshooting.md](troubleshooting.md)
- [docs/privacy.md](privacy.md)
- [docs/security-model.md](security-model.md)

**Expected Result**

- Commands match `package.json`.
- Links resolve.
- Alpha limitations are visible.
- No fake production claims exist.
- No broken Cyrillic encoding appears.

**Common Failure**

- README references a script that does not exist.
- Docs describe a feature as complete when it is experimental.

**Fix Suggestion**

- Update docs in the same change that changes behavior.
- Keep experimental features explicitly labeled.

```text
[ ] Pass  [ ] Fail  [ ] Skipped  Notes:
```

## 23. Final Sign-Off

**Command / Action**

Run final source check:

```bash
npm run check
```

Optional native release build if desktop artifacts are part of this QA pass:

```bash
npm run release:build
```

**Expected Result**

- Full check passes.
- Native build either passes or is explicitly skipped with environment notes.
- Known limitations are documented before release.

**Common Failure**

- QA passes manually but automated checks fail.
- Native build fails because the local machine does not have Tauri prerequisites.

**Fix Suggestion**

- Do not mark the release ready until `npm run check` passes.
- If native artifacts are not part of this QA pass, document that clearly.

Final record:

```text
Release candidate:
QA owner:
Source alpha ready: [ ] Yes  [ ] No
Native artifacts ready: [ ] Yes  [ ] No  [ ] Not part of this release
Known failures:
Release blocking: [ ] Yes  [ ] No
```

## Related

- [Installation](installation.md)
- [Quickstart](quickstart.md)
- [Troubleshooting](troubleshooting.md)
- [Final Alpha Summary](final-alpha-summary.md)

## Next Steps

If this checklist fails, fix blockers before release and update [Final Alpha Summary](final-alpha-summary.md).
