# Filters

Purpose: document timeline search, filters, presets, and invalid filter handling.

SocketLens filters are designed for noisy realtime streams where heartbeat, reconnect, and repeated events can hide the useful frame.

## Timeline Search

Search can match:

- payload text;
- event names;
- direction labels;
- decoded summaries.

The search input is debounced to avoid unnecessary work while typing.

## Filter Controls

Implemented filters:

- all/incoming/outgoing;
- JSON only;
- errors only;
- hide ping/pong;
- hide heartbeat;
- event-name query;
- payload text search;
- regex search;
- size bounds through filter state;
- smart payload conditions.

## Smart Payload Conditions

Supported examples:

```text
payload.type != "heartbeat"
payload.event == "chat.message"
payload.user.id == "123"
```

Smart filters operate on parsed JSON payloads. Non-JSON payloads do not match JSON-path-like conditions.

## Invalid Filters

Invalid regex or smart filter input must not crash the UI.

Expected behavior:

- the UI shows a clear validation issue;
- the timeline stays stable;
- the user can clear filters and continue.

## Presets and Favorites

Filter presets are stored locally. Favorite presets are surfaced first for quick reuse.

## Related

- [Grouping](grouping.md)
- [Packet Timeline in Function Inventory](function-inventory.md#packet-timeline)
- [Adding a Filter](adding-a-filter.md)
- [Manual QA](manual-qa.md)

## Next Steps

If repeated events are still noisy, read [Grouping](grouping.md).

