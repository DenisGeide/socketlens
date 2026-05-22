# Extension Points

SocketLens is an alpha product, but the core should be stable enough that contributors add focused extensions instead of rewriting packet capture, stores, or UI plumbing.

Extension contracts live in:

```text
apps/desktop/src/extensions
```

These are explicit TypeScript extension points. SocketLens does not have runtime plugin loading yet. New extensions are added to the codebase, tested, then wired into the relevant service/store.

## Current Extension Points

| Extension | Contract | Built-in file | Use case |
| --- | --- | --- | --- |
| Packet decoder | `PacketDecoder`, `DecoderRegistry`, `BinaryDecoder` | `packet-decoder.ts` | Parse payloads and produce event name, preview, tags, metadata, decoded data. |
| Packet analyzer | `PacketAnalyzer` | `packet-analyzer.ts` | Classify packets as auth, chat, error, notification, heartbeat, or ok. |
| Filter engine | `FilterEngine` | `filter-engine.ts` | Apply search, direction, JSON/error, ping/pong, size, and session filters. |
| Export adapter | `ExportAdapter` | `export-adapter.ts` | Create serialized session/packet export files. |
| AI provider | `AIProvider` | `ai-provider.ts` | Register optional AI providers without making AI required. |
| Replay strategy | `ReplayStrategy` | `replay-strategy.ts` | Prepare replay payloads and replay history records. |

## PacketDecoder

Use a decoder when SocketLens needs to understand a specific protocol shape without changing timeline or inspector components.

Contract:

```ts
export type PacketDecoder = {
  canDecode: (packet: Packet) => boolean;
  decode: (packet: Packet) => DecodedPacket;
  id: string;
  label: string;
  priority: number;
};
```

Decoder selection is handled by `DecoderRegistry`. Higher `priority` values run first. If a decoder throws, the registry returns the raw fallback decoded packet and records fallback metadata instead of crashing the UI.

Built-in decoder classes:

- `SocketIoDecoder`
- `GraphqlWsDecoder`
- `JsonDecoder`
- `RawBinaryDecoder`
- `FallbackDecoder`

Future binary formats such as Protobuf, MessagePack, and BSON should extend `BinaryDecoder` instead of changing timeline or inspector components.

Example:

```ts
import type { PacketDecoder } from "@/extensions";

export const graphqlWsDecoder: PacketDecoder = {
  id: "example.decoder.graphql-ws",
  label: "GraphQL over WebSocket decoder",
  priority: 80,
  canDecode: (packet) => packet.payloadKind === "json" && packet.payload.includes('"type"'),
  decode: (packet) => {
    const payload = JSON.parse(packet.payload) as { id?: string; type?: string };

    return {
      data: payload,
      decoderId: "example.decoder.graphql-ws",
      eventName: payload.type ? `graphql.${payload.type}` : "graphql.frame",
      metadata: {
        operationId: payload.id ?? null,
      },
      payloadKind: "json",
      preview: payload.id ? `operation ${payload.id}` : packet.payload,
      tags: ["json", "graphql-ws"],
    };
  },
};
```

To wire it:

1. Add the decoder file under `apps/desktop/src/extensions`.
2. Add focused tests next to it.
3. Add it to `defaultPacketDecoders`.
4. Do not parse that protocol directly in React components.

Full contributor guide: [docs/adding-a-decoder.md](adding-a-decoder.md).

## PacketAnalyzer

Use an analyzer when decoded packet data needs a stable visual category.

Default categories:

```text
auth
chat
error
notification
heartbeat
ok
```

Keep analyzers deterministic and cheap. They run during timeline rendering, filtering, and search.

## FilterEngine

`defaultFilterEngine` owns the current search/filter behavior. `filterPackets()` in `models/filter-state.ts` delegates to it so old imports keep working.

Add a new filter only when it belongs to all packet views. Local UI-only filtering should stay in the component that owns it.

Rules:

- never mutate packets,
- keep matching synchronous and fast,
- cache expensive derived text outside render paths when needed,
- update `filter-state.test.ts` or extension tests.

## ExportAdapter

Use an export adapter when adding a new export format such as HAR-like JSON or NDJSON.

Current built-ins:

- `socketLensSessionExportAdapter`
- `socketLensPacketExportAdapter`

Rules:

- keep the existing SocketLens session JSON format backward-compatible,
- create a new adapter for new formats,
- do not put file dialog behavior in an adapter,
- storage remains in `lib/session-file-storage.ts`.

## AIProvider

AI is optional and disabled by default. Providers must not be required for capture, replay, filters, sessions, or inspector behavior.

Current built-ins:

- OpenAI-compatible
- Ollama

Rules:

- no hardcoded keys,
- validate settings before network calls,
- send data only after explicit user action,
- keep privacy warnings visible in UI.

## ReplayStrategy

Replay strategies prepare payloads. They should not directly write to sockets or stores.

Current default behavior:

- replay requires an active connection,
- replay requires a selected packet,
- replay preserves the packet payload unless the caller passes an override,
- replay history is explicit.

Use a new strategy only if a future protocol needs safe payload rewriting before replay.

## What Not To Extend Yet

Avoid adding these until there is a clear product need:

- dynamic marketplace plugins,
- remote plugin loading,
- cloud accounts,
- telemetry pipelines,
- enterprise policy systems.

For `v0.1.0-alpha`, extension points are source-level contracts for contributors.
