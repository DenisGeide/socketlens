# Screenshots

Use this guide when replacing public screenshot placeholders.

For explanations of what each visible panel does, see [docs/ui-guide.md](ui-guide.md).
For exact screenshot-ready app states, see [docs/demo-states.md](demo-states.md).

## Placeholder Files

README references these files:

```text
docs/assets/screenshots/main-ui.png
docs/assets/screenshots/demo-mode.png
docs/assets/screenshots/direct-mode.png
docs/assets/screenshots/packet-inspector.png
docs/assets/screenshots/settings.png
docs/assets/screenshots/proxy-mode.png
docs/assets/screenshots/launcher-terminal.png
docs/assets/screenshots/launcher-shortcuts.png
```

Keep these filenames unless every reference is updated in the same change.

## Capture Rules

- Capture real implemented SocketLens behavior.
- Prefer screenshot states from [demo-states.md](demo-states.md) so every image explains a specific workflow.
- Do not edit fake production traffic into screenshots.
- Use Demo Mode or the local echo server unless the target is intentionally documented.
- Do not show secrets, customer payloads, private URLs, usernames, browser bookmarks, or local file paths.
- Keep AI screenshots honest: if AI is disabled or using demo output, make that visible.
- Prefer dark theme for README and release screenshots.

## Recommended Sizes

| Use | Size |
| --- | --- |
| README hero screenshot | `1440x900` |
| GitHub release thumbnail | `1280x720` |
| GIF / short video source | `1920x1080` |
| Detailed docs screenshot | `1600x1000` |
| Narrow QA screenshot | `390x844` |

## Recommended Screenshot Order

1. `main-ui.png`: active workspace overview with timeline, sidebar, inspector, and logs visible.
2. `demo-mode.png`: Investor Demo running with simulated packets and a selected packet.
3. `direct-mode.png`: connected to `ws://127.0.0.1:17787` with real echo-server packets.
4. `packet-inspector.png`: selected packet with Pretty JSON visible. Raw and Metadata should be reachable from the tabs.
5. `settings.png`: language, appearance, Workspace/packet retention, AI disabled/privacy state.
6. `proxy-mode.png`: desktop Proxy Mode with target URL, local proxy URL, and captured proxy packets.
7. `launcher-terminal.png`: branded launcher terminal state after web mode starts.
8. `launcher-shortcuts.png`: optional Windows desktop shortcuts and shortcut generator output.

## What Each Screenshot Should Explain

| File | What a viewer should understand |
| --- | --- |
| `main-ui.png` | SocketLens is a desktop-style WebSocket workspace: sidebar for traffic sources, center timeline, right inspector, bottom logs. |
| `demo-mode.png` | The app can look alive immediately without setup, and all demo traffic is clearly synthetic. |
| `direct-mode.png` | A real local WebSocket connection works through the echo server, with incoming frames visible in the timeline. |
| `packet-inspector.png` | Selecting a packet opens formatted payload, metadata, copy, and optional AI explain controls. |
| `settings.png` | Language, density, packet retention/memory, AI provider, and privacy controls are local and explicit. |
| `proxy-mode.png` | Native desktop proxy mode exposes a local proxy URL and captures frames from an external client. |
| `launcher-terminal.png` | One-click launchers call the real npm scripts and show clear startup status. |
| `launcher-shortcuts.png` | Windows users can generate desktop shortcuts for Web, Desktop, and Echo Server modes. |

## Optional Documentation Screenshots

These are useful in docs, but they do not need to appear in the main README:

| Optional file | Purpose |
| --- | --- |
| `memory-panel.png` | Expanded Memory section showing retained packet count and retention limit. |
| `diagnostics.png` | Expanded Diagnostics section for connection/proxy troubleshooting. |
| `logs-panel.png` | Expanded logs with connection, proxy, and frame lifecycle messages. |
| `manual-send-replay.png` | Manual JSON/raw send, previous outgoing packets, and replay history. |
| `session-files.png` | Save/load/export/import session file controls. |
| `packet-inspector-raw.png` | Raw payload tab showing unmodified frame content. |
| `packet-inspector-metadata.png` | Metadata tab showing packet, session, connection, size, and kind fields. |

If you capture optional screenshots, reference them from detailed docs instead of overcrowding the README.

## Demo GIF

Use `docs/assets/demo/socketlens-demo.gif` only after recording a real app run. Do not commit a fake GIF placeholder.

Recommended GIF source:

- `1920x1080`, 30 FPS video capture,
- 30-45 seconds,
- Investor Demo Mode first,
- Direct Mode with the local echo server second,
- one selected packet and one replay action.

The detailed recording guide lives in [docs/assets/demo/README.md](assets/demo/README.md).

## Local Setup For Screenshots

Web mode:

```bash
npm run dev
```

Echo server:

```bash
npm run dev:echo
```

Desktop mode:

```bash
npm run dev:desktop
```

Use browser mode for Demo and Direct screenshots. Use desktop mode for Proxy screenshots.

## File Naming For Extra Screenshots

For additional screenshots, use:

```text
socketlens-v<version>-<sequence>-<area>-<state>-<theme>-<viewport>-<locale>.png
```

Example:

```text
socketlens-v1.0.0-alpha-03-direct-echo-connected-dark-1440x900-ru.png
```
