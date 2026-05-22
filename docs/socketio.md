# Socket.IO Support

SocketLens includes initial Socket.IO decoding so Socket.IO traffic is easier to read than a raw WebSocket frame stream.

Status: alpha. The decoder improves visibility while preserving the original payload.

## What SocketLens Decodes

SocketLens detects common Engine.IO and Socket.IO frames:

- Engine.IO open, ping, pong, close, upgrade, and noop frames.
- Socket.IO namespace connect and disconnect frames.
- Socket.IO event frames such as `42["chat.message", {...}]`.
- Namespaced events such as `42/chat,["chat.message", {...}]`.
- Acknowledgement ids such as `42/chat,7["chat.message", {...}]`.
- Ack frames such as `43/chat,7[{"ok":true}]`.
- Binary event and binary ack packet labels when the frame contains the Socket.IO binary packet prefix.

Decoded packets show:

- protocol badge: `Socket.IO`,
- decoded event name,
- namespace,
- acknowledgement id when present,
- packet type,
- Engine.IO packet type,
- decoded payload in the Pretty inspector tab.

## Raw View Is Preserved

SocketLens does not mutate captured traffic.

The Payload Inspector keeps both views:

- **Pretty**: decoded Socket.IO structure when the frame is recognized.
- **Raw**: the original WebSocket payload exactly as captured.

Session exports keep the original packet payload. Socket.IO decoding is a UI/domain interpretation layer.

## Run the Demo Server

From the repository root:

```bash
npm run dev:socketio
```

Expected server output includes:

```text
Direct Mode transport URL: ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

Connect SocketLens Direct Mode to:

```text
ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

Then send a Socket.IO namespace connect frame:

```text
40/chat,
```

Send event frames:

```text
42/chat,1["chat.message",{"text":"Hello from SocketLens","room":"launch"}]
42/chat,2["presence.update",{"status":"typing"}]
42/chat,3["cause.error",{}]
```

Expected result:

- timeline rows show the `Socket.IO` protocol badge,
- event names such as `chat.message` and `presence.update` appear in the timeline,
- Metadata shows namespace `/chat`,
- Metadata shows acknowledgement ids `1`, `2`, and `3`,
- Raw tab still shows the original frame text.

## Fallback Behavior

If a text frame is not recognized as Socket.IO, SocketLens leaves it as normal text or JSON traffic.

If a frame looks like Socket.IO but cannot be fully decoded, SocketLens labels it as an unknown Socket.IO frame and still keeps the raw payload available.

## Alpha Limitations

- SocketLens does not act as a Socket.IO client abstraction. Direct Mode still connects to the underlying Engine.IO WebSocket transport URL.
- Binary packet prefixes are labeled, but binary attachment reconstruction is not implemented yet.
- Advanced Socket.IO auth/header rewriting is not included.
- Proxy Mode captures forwarded frames, but Socket.IO-specific connection orchestration remains the responsibility of the external client.
