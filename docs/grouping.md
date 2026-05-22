# Packet Grouping

Purpose: explain how SocketLens reduces noise in large realtime streams without hiding original data permanently.

Grouping is a visual timeline feature. It does not delete packets or mutate captured payloads.

## What Can Be Grouped

SocketLens can group:

- repeated adjacent events;
- heartbeat storms;
- auth flow-like packets;
- reconnect flow-like packets;
- related request/response packets when enough metadata exists.

## Expandable Groups

Group rows can be expanded so the user can inspect the original packets in captured order.

This is important because grouping is a readability tool, not a data reduction step.

## Toggle

Grouping can be turned on/off from the timeline controls.

Use grouping when:

- the stream is noisy;
- heartbeat traffic dominates the session;
- repeated events hide more important packets.

Turn grouping off when:

- you need the exact row-by-row frame sequence;
- you are comparing timestamps manually.

## Related

- [Filters](filters.md)
- [Packet Relationships](packet-relationships.md)
- [Architecture](architecture.md)
- [Function Inventory](function-inventory.md#packet-timeline)

## Next Steps

Use [Filters](filters.md) with grouping for large sessions.

