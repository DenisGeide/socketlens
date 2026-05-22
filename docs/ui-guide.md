# UI Guide

This guide explains what each visible SocketLens area is for. Use it when writing docs, reviewing screenshots, or helping a first-time user understand the product.

SocketLens is arranged like a desktop developer tool:

```text
left sidebar        center workspace          right inspector
connections/tools   packet timeline           selected payload details
bottom strip        logs/status
```

The timeline is the main workspace. The sidebar helps create traffic. The inspector explains the selected packet.

## Top Bar

The top bar shows the current app state and global actions.

- **Status badge**: current connection state such as Idle, Demo, Connected, or Proxy.
- **Frame count**: number of captured packets in the active session.
- **Clear**: clears packets for the selected session.
- **Settings**: opens local preferences.
- **Start Investor Demo**: starts the guided offline demo.
- **Connect / Disconnect**: opens direct connection flow or closes the active direct connection.

Screenshot to capture: include the top bar inside `main-ui.png`, `demo-mode.png`, `direct-mode.png`, and `proxy-mode.png`.

## Connection Manager

The left sidebar is the control surface. It should answer: "How do I create traffic?"

### Investor Demo

Starts a guided offline story with simulated realtime traffic. It is useful for first-run demos, screenshots, and investor walkthroughs. The traffic is marked as demo traffic and does not require a server.

Recommended screenshot: `demo-mode.png`.

### Demo Packet Stream

Starts a simpler continuous synthetic packet stream. It is useful for testing timeline performance, filters, packet selection, and inspector behavior without touching a real endpoint.

Recommended screenshot: optional docs screenshot if you want to explain load testing.

### How Packets Arrive

Explains the difference between the two real capture modes:

- **Direct connection**: SocketLens itself connects to a `ws://` or `wss://` server and captures frames it sends or receives.
- **Proxy mode**: another app connects to a local SocketLens proxy URL. SocketLens forwards traffic to the target and captures frames in both directions.

Recommended screenshots: `direct-mode.png` and `proxy-mode.png`.

### Quick Connect: Echo Server

Documents the fastest real test path. Start the local echo server with:

```bash
npm run dev:echo
```

Then connect to:

```text
ws://127.0.0.1:17787
```

SocketLens creates or reuses a saved direct connection and opens it immediately.

Recommended screenshot: `direct-mode.png`.

### Send Your First Message

Explains that packets appear after a connection receives or sends frames. Use Manual Send to send `{"command":"ping"}` to the echo server and watch the response appear in the timeline.

Recommended screenshot: optional `manual-send-replay.png` if added later.

### Selected Direct Connection

Shows the active or selected endpoint, its status, and reconnect/disconnect actions. It confirms whether the user is inspecting a real WebSocket endpoint or just demo traffic.

Recommended screenshot: `direct-mode.png`.

### Saved WS:// Endpoints

Stores recent direct WebSocket endpoints locally when that privacy setting is enabled. Demo sessions do not appear here.

Recommended screenshot: optional sidebar detail screenshot.

### Diagnostics

Shows technical state for the current connection, including status, socket state, endpoint, proxy client count, session, and reconnect status. It is for debugging "why am I not seeing packets?"

Recommended screenshot: optional `diagnostics.png`.

### Memory

Shows packet retention health for the current workspace. This answers:

- how many packets are currently retained,
- what the retention limit is,
- whether SocketLens is keeping the newest packets and clearing old retained packets.

The retention limit is configured in **Settings -> Workspace -> Packet retention**. This is important for high-volume sessions because SocketLens is designed to handle many packets without keeping unlimited data in memory.

Recommended screenshots:

- `settings.png`: show the Workspace / Packet retention section.
- optional `memory-panel.png`: show the expanded sidebar Memory section when there are packets.

### Manual Send

Lets users send JSON or raw text frames over the active direct connection. It includes example payloads for ping, auth, and chat, plus replay controls for previous outgoing packets.

Recommended screenshot: optional `manual-send-replay.png`.

### Session Files

Saves and loads SocketLens session JSON files. This is local file persistence, not cloud sync. Use it to reopen a debugging session later or share a reproducible packet capture.

Recommended screenshot: optional `session-files.png`.

### Sessions

Lists local sessions created by Demo, Direct, or Proxy workflows. Selecting a session changes which packets appear in the timeline.

Recommended screenshot: optional sidebar detail screenshot.

## Packet Timeline

The center workspace is the product's main value. It should answer: "What happened over the WebSocket?"

Timeline rows show:

- direction: Incoming or Outgoing,
- event name,
- event category badge such as Chat, Auth, Heartbeat, Error, or Event,
- timestamp,
- packet size,
- payload preview when privacy settings allow it,
- payload kind such as JSON.

The timeline header includes:

- payload/event/direction search,
- filters for direction, JSON, errors, and ping/pong visibility,
- shown/in/out counters,
- pause auto-scroll,
- clear packets.

Recommended screenshots:

- `main-ui.png`: timeline overview with selected packet.
- `demo-mode.png`: rich simulated traffic.
- `direct-mode.png`: echo-server traffic.
- `proxy-mode.png`: proxy-captured traffic.

## Payload Inspector

The right panel explains the selected packet. It should answer: "What is inside this frame?"

Header cards show:

- event name,
- direction,
- size,
- timestamp.

Tabs:

- **Pretty**: formatted JSON for readable payloads.
- **Raw**: original text payload without translation or rewriting.
- **Metadata**: connection ID, session ID, packet ID, payload kind, and transport details.

The inspector also contains the AI Explain Packet panel. AI is optional and disabled by default. Packet data is sent only after the user clicks the explain action and only to the configured provider.

Recommended screenshot: `packet-inspector.png` with the Pretty tab selected. Extra detail screenshots can be named `packet-inspector-raw.png` and `packet-inspector-metadata.png` if you want docs for each tab.

## Logs

The bottom panel shows app-level status and troubleshooting events:

- connections,
- proxy start/stop events,
- received frame messages,
- errors,
- settings updates,
- cleanup events.

When collapsed, it becomes a compact status strip. When expanded, it is a chronological diagnostic log.

Recommended screenshot: optional `logs-panel.png`, especially for proxy troubleshooting.

## Settings

Settings are local preferences.

### Language

Switches interface language. Payloads, JSON, URLs, traffic logs, and session files are not translated.

### Appearance

Controls theme, compact mode, and default auto-scroll behavior.

### Workspace

Controls packet retention. This is where users learn how memory is managed for high-volume sessions.

### AI Provider

Configures optional AI providers. AI is disabled by default and SocketLens works fully without it.

### Privacy

Explains local-first behavior, recent endpoint persistence, and timeline payload previews.

Recommended screenshot: `settings.png`.

## Screenshot Set For Public Launch

Minimum README set:

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

Recommended extra docs screenshots:

```text
docs/assets/screenshots/memory-panel.png
docs/assets/screenshots/diagnostics.png
docs/assets/screenshots/logs-panel.png
docs/assets/screenshots/manual-send-replay.png
docs/assets/screenshots/session-files.png
docs/assets/screenshots/packet-inspector-raw.png
docs/assets/screenshots/packet-inspector-metadata.png
```

Extra screenshots are optional. Keep README focused on the minimum set and use extra screenshots in detailed docs only.
