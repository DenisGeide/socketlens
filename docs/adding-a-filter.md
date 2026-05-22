# Adding A Filter

Filters keep noisy realtime sessions usable. A good filter is fast, predictable, and easy to clear.

## Files

```text
apps/desktop/src/models/filter-state.ts
apps/desktop/src/models/packet-filter.ts
apps/desktop/src/extensions/filter-engine.ts
apps/desktop/src/models/filter-state.test.ts
apps/desktop/src/extensions/packet-decoder.test.ts
```

UI controls usually live near the timeline/search UI:

```text
apps/desktop/src/components
```

## Current Filter Flow

```text
FilterState
  -> compileFilterState()
  -> defaultFilterEngine.apply()
  -> PacketTimeline receives filtered packets
```

`models/packet-filter.ts` exports `filterPackets()` as the compatibility wrapper around `defaultFilterEngine.apply()`.

## When To Add A Filter

Add a filter to `FilterState` only when it should apply globally to packet lists.

Good examples:

- direction,
- payload kind,
- errors only,
- hide heartbeat,
- hide ping/pong,
- size range,
- event query,
- search text/regex,
- smart payload condition.

Do not add global state for a one-off local UI view. Keep panel-specific filters inside that panel.

## Step-By-Step

1. Add the state field to `FilterState` in `apps/desktop/src/models/filter-state.ts`.
2. Add a default value to `defaultFilterState`.
3. Normalize the field in `normalizeFilterState()`.
4. Compile/validate it in `compileFilterState()` if the field needs parsing.
5. Apply matching behavior in `apps/desktop/src/extensions/filter-engine.ts`.
6. Add or update UI controls.
7. Add tests for matching, clearing, invalid input, and large lists.
8. Update docs only if the filter is user-visible.

## Smart Filter Rules

Current smart filters support simple payload path comparisons:

```text
payload.command == "ping"
payload.type != "heartbeat"
payload.user.id == "123"
```

Rules:

- only JSON payloads can match smart payload conditions,
- invalid expressions produce validation issues,
- invalid filters should not crash the app,
- unknown paths should simply not match unless using `!=` semantics.

## Performance Rules

- Do not mutate packets.
- Do not parse JSON repeatedly if a cache/helper already exists.
- Keep matching synchronous.
- Avoid broad regex work unless the user explicitly selected regex mode.
- Keep empty-state behavior clear when filters hide all packets.

## Minimal Example

Adding a global `hasRequestId` filter would require:

1. `hasRequestId: boolean` in `FilterState`.
2. `hasRequestId: false` in `defaultFilterState`.
3. normalization in `normalizeFilterState()`.
4. matching in `defaultFilterEngine`:

```ts
if (filterState.hasRequestId && !getPacketSummary(packet).preview.includes("requestId")) {
  return false;
}
```

This example is intentionally simplified. Prefer shared JSON helpers when reading structured payload fields.

## Tests

Run:

```bash
npm run test --workspace @socketlens/desktop
npm run check
```

Test:

- default filter returns original packet array when inactive,
- filter matches expected packets,
- clear/reset restores all packets,
- invalid regex/smart query returns a validation issue,
- malformed JSON does not crash,
- large packet arrays remain fast enough for normal use.

## What Not To Do

- Do not put filter logic directly inside timeline rendering.
- Do not add global filter fields for local-only UI concerns.
- Do not hide invalid filter errors.
- Do not make filtering mutate packets, sessions, or settings.
