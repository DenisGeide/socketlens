# Direct Mode

Direct Mode lets SocketLens connect directly to a WebSocket endpoint from inside the app.

Use Direct Mode when you want SocketLens itself to be the WebSocket client.

## When to Use Direct Mode

Use Direct Mode for:

- testing a local WebSocket server
- sending manual JSON or text frames
- replaying previous outbound packets
- debugging connection lifecycle errors
- inspecting traffic without changing another app

Direct Mode works in browser development mode and in the native desktop app.

## Start a Test Server

The easiest endpoint is the included echo server:

```bash
npm run dev:echo
```

It listens on:

```text
ws://127.0.0.1:17787
```

## Start SocketLens

Browser development mode:

```bash
npm run dev
```

Native desktop mode:

```bash
npm run dev:desktop
```

## Create a Connection

1. Keep **Capture mode** set to **Direct**.
2. Click **New** in the connection manager.
3. Enter a connection name.
4. Enter a WebSocket URL.
5. Click **Save** or **Connect**.

Supported URL schemes:

- `ws://`
- `wss://`

URLs are validated before connecting. Invalid URLs show a friendly error instead of crashing the app.

## Connection Statuses

Direct connections use these statuses:

- `idle`: saved but not active
- `connecting`: WebSocket handshake is in progress
- `connected`: socket is open
- `disconnected`: socket was closed normally
- `error`: socket failed or closed unexpectedly

The diagnostics panel shows current mode, endpoint, socket ready state, active session, reconnect attempts, last close reason, and last error.

## Send Messages

When connected, use **Manual send**:

- **JSON** mode validates and formats structured payloads.
- **Raw text** mode sends plain text frames.
- **Sample** loads a safe example payload.
- **Send frame** sends the current draft.

Outbound frames are recorded as packets immediately. Echoed or server-sent messages appear as inbound packets.

## Replay Packets

SocketLens records recent manual sends and replays.

Use:

- **Selected packet** to load the currently highlighted timeline packet into the editor or replay its payload.
- **Replay last** to resend the most recent outbound frame.
- **Replay sequence** to resend a short ordered group of recent outbound frames.
- **Delay controls** to add a small pause between sequence frames when testing retry/backoff behavior.
- **Previous outgoing** to load an earlier outbound packet into the editor.
- **Replay history** to resend a previous frame.
- **Replay edited** to resend an edited payload as a replay.

Replay is only enabled while a direct WebSocket connection is active.
Disconnected replay attempts show a visible replay status and a user-facing error instead of failing silently.

## Search and Inspect

Captured direct-mode packets appear in the same packet timeline as demo and proxy traffic.

You can:

- search payloads, event names, and directions
- filter incoming/outgoing frames
- show JSON-only traffic
- show errors-only traffic
- hide ping/pong noise
- select a packet and inspect Pretty, Raw, and Metadata views

## Reconnect and Disconnect

Use **Disconnect** to close the active socket. Use **Reconnect** from connection history to reconnect a saved endpoint.

Reconnect is manual and has a short cooldown so the app does not enter an infinite reconnect loop.

## Recent Connection History

Recent direct connections can persist locally. Disable **Persist recent connections** in Settings if you do not want endpoint names and URLs stored in local app storage.

Demo connections are not written to persistent direct connection history.

## Limitations

Direct Mode sees only traffic sent through SocketLens. If another browser tab or app is already using a WebSocket connection, use Proxy Mode when you need to observe that external client.
