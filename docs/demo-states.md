# Screenshot-Friendly Demo States

Use these states when preparing README screenshots, release images, GIFs, or investor demo clips.

The goal is to show real implemented behavior. Do not edit fake production traffic into screenshots, and do not imply that alpha-only workflows are stable commercial features.

## Recommended Environment

- Theme: dark.
- Window: `1440x900` for README screenshots.
- Recording: `1920x1080`, 30 FPS, 30-45 seconds.
- Language: English for global GitHub screenshots; Russian is useful for local launch posts.
- Data: Investor Demo Mode, continuous Demo mode, local echo server, or native proxy against the local echo server.

## State 1: Main Workspace

File:

```text
docs/assets/screenshots/main-ui.png
```

How to capture:

1. Start web mode with `npm run dev`.
2. Start Investor Demo Mode.
3. Select a packet with a readable JSON payload.
4. Keep timeline, inspector, and logs visible.

Expected visible proof:

- left sidebar explains traffic sources,
- center timeline has multiple packets,
- right inspector shows selected payload,
- bottom logs are not empty or collapsed into an unclear state.

## State 2: Investor Demo Mode

File:

```text
docs/assets/screenshots/demo-mode.png
```

How to capture:

1. Start from a clean or calm workspace.
2. Click **Start Investor Demo**.
3. Wait until auth, chat, heartbeat, notification, and error/replay examples appear.
4. Select a visually rich packet.

Expected visible proof:

- status shows Demo,
- packet count is non-zero,
- traffic is clearly simulated/demo,
- selected packet appears in the inspector.

## State 3: Direct Echo Connection

File:

```text
docs/assets/screenshots/direct-mode.png
```

How to capture:

1. Run the echo server:

   ```bash
   npm run dev:echo
   ```

2. Connect SocketLens to:

   ```text
   ws://127.0.0.1:17787
   ```

3. Send:

   ```json
   { "command": "ping" }
   ```

4. Select the incoming response.

Expected visible proof:

- connection status is connected,
- timeline shows incoming and outgoing frames,
- inspector shows the selected echo response,
- sidebar makes it clear this is a real local endpoint.

## State 4: Payload Inspector

Files:

```text
docs/assets/screenshots/packet-inspector.png
docs/assets/screenshots/packet-inspector-raw.png
docs/assets/screenshots/packet-inspector-metadata.png
```

How to capture:

1. Select a JSON packet from Demo or Direct Mode.
2. Capture Pretty view.
3. Switch to Raw and Metadata for optional detailed docs screenshots.

Expected visible proof:

- event name, direction, size, and timestamp are visible,
- Pretty shows formatted JSON,
- Raw keeps the original payload,
- Metadata shows packet/session ids without pretending they are user-facing features.

## State 5: Manual Send And Replay

File:

```text
docs/assets/screenshots/manual-send-replay.png
```

How to capture:

1. Connect Direct Mode to the local echo server.
2. Send the ping example.
3. Select the previous outgoing packet.
4. Show replay history after replaying once.

Expected visible proof:

- send controls are enabled,
- previous outgoing payload is visible,
- replay history shows an actual replay event.

## State 6: Proxy Mode

File:

```text
docs/assets/screenshots/proxy-mode.png
```

How to capture:

1. Use desktop/Tauri mode with `npm run dev:desktop`.
2. Start the echo server.
3. Start proxy with target `ws://127.0.0.1:17787`.
4. Connect an external client to the local proxy URL.
5. Send one JSON frame and select a captured packet.

Expected visible proof:

- proxy status is live,
- local proxy URL is visible,
- target URL is visible,
- timeline contains proxy-captured packets.

## State 7: Settings And Privacy

File:

```text
docs/assets/screenshots/settings.png
```

How to capture:

1. Open Settings.
2. Show Language, Appearance, Workspace, AI Provider, and Privacy in one clean vertical flow.
3. Keep AI disabled unless documenting provider setup.

Expected visible proof:

- local-first privacy copy is visible,
- AI disabled/default state is clear,
- packet retention settings are visible.

## GIF Demo Flow

Target file when a real GIF is captured:

```text
docs/assets/demo/socketlens-demo.gif
```

Recommended sequence:

1. Open SocketLens.
2. Start Investor Demo Mode.
3. Select a highlighted packet.
4. Show Pretty, Raw, and Metadata briefly.
5. Connect to the local echo server.
6. Send `{ "command": "ping" }`.
7. Replay the outgoing packet.

Do not add a fake GIF placeholder to the README. Embed the GIF only after recording a real app run.
