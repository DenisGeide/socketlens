# Examples

Local examples help contributors test SocketLens without a production backend.

## Echo Server

Location:

```text
examples/echo-server
```

Run from the repository root:

```bash
npm run dev:echo
```

Default endpoint:

```text
ws://127.0.0.1:17787
```

Use this for Direct Mode and Proxy Mode QA.

## Chat Demo

Location:

```text
examples/chat-demo
```

Run from the repository root:

```bash
npm run dev:chat
```

This is a small browser demo app for local realtime experiments.

## Socket.IO Demo

Location:

```text
examples/socketio-demo
```

Run from the repository root:

```bash
npm run dev:socketio
```

Default Direct Mode transport URL:

```text
ws://127.0.0.1:17810/socket.io/?EIO=4&transport=websocket
```

Use this to test initial Socket.IO frame detection, event names, namespaces, acknowledgement ids, and raw fallback behavior.
