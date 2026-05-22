# Adding a Packet Decoder

SocketLens decoders turn raw captured packets into a stable `DecodedPacket` shape for the timeline, filters, inspector, flow analysis, and future protocol-specific UI.

The raw packet payload is never mutated. Raw view and session export keep the original captured payload.

## Where Decoders Live

Current source-level decoder architecture lives in:

```text
apps/desktop/src/extensions/packet-decoder.ts
apps/desktop/src/extensions/types.ts
```

Built-in decoder classes:

- `SocketIoDecoder`
- `GraphqlWsDecoder`
- `JsonDecoder`
- `RawBinaryDecoder`
- `FallbackDecoder`

Selection is handled by `DecoderRegistry`.

## Decoder Contract

`PacketDecoder` is the source-level extension contract:

```ts
export type PacketDecoder = {
  canDecode: (packet: Packet) => boolean;
  decode: (packet: Packet) => DecodedPacket;
  id: string;
  label: string;
  priority: number;
};
```

Rules:

- `canDecode()` must be cheap and safe.
- `decode()` must return a `DecodedPacket`.
- `priority` controls decoder order. Higher priority runs first.
- Decoders should not mutate packets.
- Decoders should not write to stores, sockets, files, or UI state.
- If a decoder cannot confidently parse a packet, return `false` from `canDecode()` and let fallback handle it.

## Decoder Priority

Built-in order today:

| Decoder | Priority | Purpose |
| --- | ---: | --- |
| `SocketIoDecoder` | `90` | Detect Socket.IO text frames before generic text fallback. |
| `GraphqlWsDecoder` | `80` | Detect GraphQL WebSocket JSON envelopes before generic JSON. |
| `JsonDecoder` | `20` | Generic JSON packets. |
| `RawBinaryDecoder` | `10` | Generic binary packets. |
| `FallbackDecoder` | `-1000` | Safe raw fallback for anything else. |

For future binary protocols:

- Protobuf decoder: use a priority above `RawBinaryDecoder`, for example `60`.
- MessagePack decoder: use a priority above `RawBinaryDecoder`, for example `55`.
- BSON decoder: use a priority above `RawBinaryDecoder`, for example `50`.

Do not give a broad decoder a high priority unless it can identify packets confidently.

## Binary Decoders

Future binary protocol decoders should extend `BinaryDecoder`.

Example skeleton:

```ts
import { BinaryDecoder, type DecodedPacket } from "@/extensions";
import type { Packet } from "@/models";

export class MessagePackDecoder extends BinaryDecoder {
  readonly id = "socketlens.decoder.messagepack";
  readonly label = "MessagePack decoder";
  readonly priority = 55;

  protected override canDecodeBinary(packet: Packet) {
    return packet.payloadKind === "binary" && packet.payload.startsWith("msgpack:");
  }

  protected override decodeBinary(packet: Packet): DecodedPacket {
    return {
      data: {
        // decoded messagepack data goes here
      },
      decoderId: this.id,
      eventName: "messagepack.frame",
      metadata: {
        protocol: "messagepack",
      },
      payloadKind: "binary",
      preview: "MessagePack frame",
      tags: ["binary", "messagepack"],
    };
  }
}
```

This keeps packet consumers stable. Timeline, inspector, filters, and session export continue to read the same `DecodedPacket` fields.

## Wiring a Decoder

1. Add the decoder class in `apps/desktop/src/extensions/packet-decoder.ts` or split it into a focused file if it grows.
2. Add it to `defaultPacketDecoders`.
3. Export it from `apps/desktop/src/extensions/index.ts`.
4. Add unit tests in `apps/desktop/src/extensions/packet-decoder.test.ts`.
5. Add protocol badge translation only if the UI needs a distinct badge.
6. Add docs if the user-visible behavior changes.

## Fallback Behavior

`DecoderRegistry` chooses the highest-priority decoder whose `canDecode()` returns `true`.

If a decoder throws while decoding, the registry returns the safe fallback decoded packet and records:

- `fallbackSourceDecoder`
- `fallbackReason`

This keeps the app stable while preserving raw payload access.

## What Not To Do

- Do not parse protocol payloads inside React components.
- Do not mutate packet payloads.
- Do not hide Raw view.
- Do not add heavy dependencies unless the protocol cannot be decoded safely without them.
- Do not claim full protocol support unless tests cover it.
