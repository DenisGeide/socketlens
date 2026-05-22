# Packet Relationships

Purpose: describe how SocketLens links related packets without pretending that every relationship is certain.

Packet relationships are derived metadata over retained packets. They do not change raw payloads.

## Relationship Types

SocketLens can identify or infer:

- request/response pairs when shared IDs are present;
- replay source relationships through `sourcePacketId`;
- auth flow-like relationships;
- reconnect flow-like relationships.

## Explicit vs Inferred

Explicit relationships come from packet metadata such as shared request IDs or replay source IDs.

Inferred relationships are conservative guesses based on nearby events and known flow patterns. UI should label them as inferred and should not claim certainty.

## Where Relationships Appear

Relationships can be surfaced in:

- packet timeline badges/hints;
- payload inspector related packet section;
- flow analysis summaries;
- replay source markers.

## Limitations

- Relationship tracking is not a full distributed tracing system.
- Missing IDs or ambiguous event names may prevent linking.
- Inferred relationships may be incomplete.
- Raw packets remain the source of truth.

## Related

- [Replay](replay.md)
- [Grouping](grouping.md)
- [Architecture](architecture.md)
- [Function Inventory](function-inventory.md)

## Next Steps

For contributor guidance, see [Extension Points](extension-points.md).

