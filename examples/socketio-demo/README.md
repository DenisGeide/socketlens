# Socket.IO Demo

This example runs a local Socket.IO server so SocketLens can test Engine.IO and Socket.IO frame decoding without a production service.

Run from the repository root:

```bash
npm run dev:socketio
```

SocketLens Direct Mode transport URL:

```text
ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

After connecting, send a namespace connect frame first:

```text
40/chat,
```

Then send Socket.IO event frames:

```text
42/chat,1["chat.message",{"text":"Hello from SocketLens","room":"launch"}]
42/chat,2["presence.update",{"status":"typing"}]
42/chat,3["cause.error",{}]
```

Expected result:

- the timeline shows Socket.IO protocol badges,
- event names are decoded from Socket.IO payload arrays,
- `/chat` is shown as the namespace in metadata,
- acknowledgement ids are parsed when present,
- Raw view still shows the original frame exactly as captured.
