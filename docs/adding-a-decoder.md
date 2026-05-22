# Adding A Packet Decoder

Packet decoders turn raw captured WebSocket frames into a stable `DecodedPacket` used by the timeline, inspector, filters, search, flow analysis, and future protocol-specific UI.

Raw packet payloads are never mutated. Raw view and session export must keep the original captured payload.

## Files

```text
apps/desktop/src/extensions/types.ts
apps/desktop/src/extensions/packet-decoder.ts
apps/desktop/src/extensions/packet-decoder.test.ts
```

Export new decoder symbols from:

```text
apps/desktop/src/extensions/index.ts
```

## Contract

```ts
export type PacketDecoder = {
  canDecode: (packet: Packet) => boolean;
  decode: (packet: Packet) => DecodedPacket;
  id: string;
  label: string;
  priority: number;
};
```

`DecodedPacket` must include:

- `data`: parsed data or safe raw data,
- `decoderId`: stable decoder id,
- `eventName`: semantic event name,
- `metadata`: small primitive metadata values,
- `payloadKind`: `json`, `text`, or `binary`,
- `preview`: compact display preview,
- `tags`: protocol/status tags.

## Registry Behavior

`DecoderRegistry`:

1. removes the fallback decoder from normal ordering,
2. sorts decoders by descending `priority`,
3. calls `canDecode(packet)` until one returns `true`,
4. calls `decode(packet)`,
5. falls back safely if `canDecode` or `decode` throws.

Current default priority order:

| Decoder | Priority | Purpose |
| --- | ---: | --- |
| `SocketIoDecoder` | `90` | Detect Engine.IO / Socket.IO text frames before generic text fallback. |
| `GraphqlWsDecoder` | `80` | Detect common GraphQL WebSocket JSON envelopes before generic JSON. |
| `JsonDecoder` | `20` | Generic JSON packets. |
| `RawBinaryDecoder` | `10` | Unknown binary packets. |
| `FallbackDecoder` | `-1000` | Safe fallback for everything else. |

Broad decoders should have lower priority than protocol-specific decoders. A decoder with high priority must identify packets confidently.

## Step-By-Step

1. Add a decoder class or constant in `apps/desktop/src/extensions/packet-decoder.ts`.
2. Keep `canDecode()` cheap, deterministic, and conservative.
3. Keep `decode()` pure: no store writes, no network calls, no file writes, no UI state.
4. Add the decoder to `defaultPacketDecoders` only when it is ready for user-facing behavior.
5. Export it from `apps/desktop/src/extensions/index.ts`.
6. Add tests in `apps/desktop/src/extensions/packet-decoder.test.ts`.
7. Update docs/README only if the behavior becomes user-visible.

## Minimal Example

```ts
import type { Packet } from "@/models";
import type { DecodedPacket, PacketDecoder } from "@/extensions/types";

export const customPacketDecoder: PacketDecoder = {
  id: "example.decoder.custom",
  label: "Custom packet decoder",
  priority: 60,
  canDecode: (packet: Packet) =>
    packet.payloadKind === "json" && packet.payload.includes('"customType"'),
  decode: (packet: Packet): DecodedPacket => {
    const payload = JSON.parse(packet.payload) as { customType?: string };

    return {
      data: payload,
      decoderId: "example.decoder.custom",
      eventName: payload.customType ? `custom.${payload.customType}` : "custom.frame",
      metadata: {
        protocol: "custom",
      },
      payloadKind: "json",
      preview: payload.customType ?? packet.payload,
      tags: ["json", "custom"],
    };
  },
};
```

## Binary Protocols

Future binary protocols should extend `BinaryDecoder`.

Current status:

- `RawBinaryDecoder` is implemented.
- `ExperimentalMessagePackDecoderStub` exists as a source-level stub only.
- `ExperimentalBsonDecoderStub` exists as a source-level stub only.
- Protobuf, MessagePack, and BSON are not user-facing supported decoders yet.

Rules for future binary work:

- keep unknown binary payloads falling back safely,
- add real fixtures,
- avoid UI/README claims until decoding works with tests,
- do not add heavy dependencies unless they are necessary and justified.

## Tests To Add

At minimum, test:

- matching packet decodes correctly,
- unrelated JSON/text/binary packets still fall back correctly,
- malformed protocol payload does not crash,
- event name and preview are stable,
- metadata does not contain secrets,
- decoder priority does not steal packets from more specific decoders.

Run:

```bash
npm run test --workspace @socketlens/desktop
npm run check
```

## What Not To Do

- Do not parse protocol payloads inside `PacketTimeline`, `PayloadInspector`, stores, or settings components.
- Do not mutate `Packet.payload`.
- Do not hide Raw view.
- Do not write to Zustand stores from a decoder.
- Do not call AI, network, filesystem, or Tauri APIs from a decoder.
- Do not claim complete protocol support without tests and docs.
