# Quickstart

Purpose: get from a fresh clone to a visible SocketLens workflow in under two minutes.

## 1. Install

```bash
npm install
```

## 2. Start SocketLens Web Mode

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:1420/
```

Expected result: the SocketLens workspace opens with the sidebar, timeline, inspector, and top bar.

## 3. Start Demo Mode

Click **Start Investor Demo**.

Expected result:

- simulated packets appear in the timeline;
- packets are marked as demo/simulated;
- selecting a packet opens payload details in the inspector.

## 4. Inspect A Packet

1. Click a packet row.
2. Open **Pretty**.
3. Open **Raw**.
4. Open **Metadata**.
5. Try **Open large view** if the payload is long.

Expected result: SocketLens shows formatted JSON when possible, preserves raw payload text, and exposes packet metadata.

## 5. Test A Real Local WebSocket

Open a second terminal:

```bash
npm run dev:echo
```

In SocketLens, connect to:

```text
ws://127.0.0.1:17787
```

Send:

```json
{ "command": "ping" }
```

Expected result:

- an outbound packet appears;
- the echo server responds;
- an inbound `command.pong` packet appears.

## 6. Replay

Select the previous outgoing packet and replay it.

Expected result:

- SocketLens sends the payload again;
- replay history records the action;
- the timeline shows the new outbound packet.

## Related

- [Installation](installation.md)
- [Demo Mode](demo-mode.md)
- [Direct Mode](direct-mode.md)
- [Replay](replay.md)
- [Manual QA](manual-qa.md)

## Next Steps

- Learn the main UI: [Function Inventory](function-inventory.md)
- Test Proxy Mode: [Proxy Mode](proxy-mode.md)
- Contribute safely: [Contributor Guide](contributor-guide.md)

