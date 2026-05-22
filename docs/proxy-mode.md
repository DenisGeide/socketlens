# Proxy Mode

Proxy Mode starts a local WebSocket proxy in the native Rust/Tauri backend. An external client connects to SocketLens, SocketLens forwards traffic to a target WebSocket server, and captured frames appear in the normal packet timeline.

Use Proxy Mode when you want to inspect traffic from another app or test client without moving that client into SocketLens Direct Mode.

If you only want to send messages from SocketLens itself, use Direct Mode instead. Proxy Mode is specifically for an external client.

## Requirements

Proxy Mode requires:

- SocketLens running as the native desktop app,
- Rust `1.77.2` or newer, Cargo, and Tauri platform prerequisites for local development,
- a reachable target WebSocket server,
- an external WebSocket client that can connect to the generated local proxy URL.

Browser development mode with `npm run dev` cannot bind the native local proxy listener. It should show a **Native backend unavailable** message and explain that Proxy Mode needs:

```bash
npm run dev:desktop
```

## Quick Test With Echo Server

Use this path for the first proxy test. It avoids production systems and uses only localhost.

Start the local echo server:

```bash
npm run dev:echo
```

Expected result:

```text
ws://127.0.0.1:17787
```

Start the native desktop app:

```bash
npm run dev:desktop
```

Then in SocketLens:

1. Switch capture mode to **Proxy**.
2. Set **Target URL** to:

   ```text
   ws://127.0.0.1:17787
   ```

3. Click **Start proxy**.
4. Copy the generated **Local proxy URL**.
5. Connect an external WebSocket client to that local proxy URL.
6. Send a message from the external client, for example:

   ```json
   { "command": "ping" }
   ```

Expected result:

- proxy status changes to live,
- connection count increases when the external client connects,
- outbound client-to-target frames appear in the packet timeline,
- inbound target-to-client frames appear in the packet timeline,
- `command.pong` appears when testing the local echo server.

## What the Proxy Panel Shows

The Proxy panel is intentionally explicit:

- visible proxy status,
- active connection count,
- captured proxy packet count,
- editable target URL before the proxy starts,
- target URL display while forwarding,
- generated local proxy URL,
- copy proxy URL button,
- backend unavailable notice when Tauri is not active,
- inline error display,
- alpha limitations section.

The target URL is the real server. The local proxy URL is the URL your external client must use.

## Lifecycle

Starting the proxy:

1. validates the target WebSocket URL,
2. binds a local `127.0.0.1` listener on an available port,
3. stores the active proxy status,
4. emits log/status updates to the frontend.

When an external client connects:

1. the backend accepts the client WebSocket handshake,
2. opens a WebSocket connection to the configured target,
3. creates a proxy session,
4. forwards frames in both directions,
5. emits captured packet events to the frontend.

Stopping the proxy:

1. stops accepting new local clients,
2. sends a shutdown signal to active proxy forwarding loops,
3. closes active proxy sessions,
4. clears local proxy URL and connection count in the UI.

SocketLens also attempts proxy cleanup when the app window closes.

If the backend becomes unavailable, stop the app and start it again with `npm run dev:desktop`.

## Captured Frames

Proxy Mode captures:

- text frames,
- JSON text frames,
- binary frames with safe preview text,
- ping/pong frames,
- close frames as session lifecycle events,
- read/write/connect errors as logs and session errors.

Client-to-target traffic appears as outbound packets. Target-to-client traffic appears as inbound packets.

## Alpha Limitations

Proxy Mode is reliable enough for alpha demos, but it is intentionally not an enterprise proxy yet.

Current limitations:

- local listener binds to `127.0.0.1`,
- browser development mode cannot run the Rust proxy,
- advanced auth/header rewriting is outside the `0.1` alpha scope,
- TLS interception is outside the `0.1` alpha scope,
- multiple target routing is outside the `0.1` alpha scope,
- binary payloads are shown as safe previews instead of decoded protocol-specific structures.

## Invalid URLs

Target URLs must:

- start with `ws://` or `wss://`,
- include a host,
- avoid URL fragments.

Invalid URLs are rejected before the backend starts the proxy. The UI keeps the error visible so the user can fix the input and retry.

## Troubleshooting

If proxy start fails:

- confirm you are running `npm run dev:desktop`,
- confirm the target server is running,
- verify the target URL starts with `ws://` or `wss://`,
- stop an existing proxy before starting another one,
- check the bottom log panel for native backend errors,
- use the local echo server first to isolate target-server issues.

If the UI says **Native backend unavailable**:

- you are probably running `npm run dev`,
- stop browser development mode if needed,
- start the native Tauri app with `npm run dev:desktop`,
- make sure Rust `1.77.2` or newer, Cargo, and Tauri platform prerequisites are installed.

If an external client connects but packets do not appear:

- make sure the external client is using the generated local proxy URL, not the target URL,
- send at least one frame from the external client,
- check whether the target server immediately closes the connection,
- watch the connection count and logs in SocketLens.

See [troubleshooting.md](troubleshooting.md).
