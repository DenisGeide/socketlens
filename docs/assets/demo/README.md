# Demo Recording Guide

Store final demo recordings or storyboard notes here.

Do not place a fake GIF or video placeholder in this folder. Add media only after recording real implemented SocketLens behavior.

## Recommended Recording

- Canvas: `1920x1080`
- Frame rate: 30 FPS
- Target length: 30 to 45 seconds
- Theme: dark
- Language: Russian for local launch material, English for GitHub/global launch material
- Data source: Investor Demo Mode and local echo server only

## Suggested Flow

1. Open SocketLens on a clean profile.
2. Start Investor Demo Mode.
3. Let packets appear in the timeline.
4. Select a packet.
5. Show Pretty, Raw, and Metadata in the inspector.
6. Show replay history.
7. Start the echo server with `npm run dev:echo`.
8. Connect Direct Mode to `ws://127.0.0.1:17787`.
9. Send `{ "command": "ping" }`.
10. Show the response and replay.

## Recording Rules

- Do not record production endpoints.
- Do not show private browser tabs, bookmarks, terminals, tokens, or local file paths.
- Do not imply stable commercial readiness; keep alpha status visible in captions or release copy.
- Do not fake production traffic in video editing software.
- If AI is disabled, show the offline demo explanation as an offline sample, not as a provider result.

## Output Naming

```text
socketlens-demo.gif
socketlens-v<version>-demo-<duration>-<viewport>-<locale>.mp4
socketlens-v<version>-demo-<duration>-<viewport>-<locale>.gif
socketlens-v0.1.0-alpha-demo-45s-1920x1080-en.mp4
```

Use `socketlens-demo.gif` only for the canonical GitHub preview GIF after it is captured from the real app.
