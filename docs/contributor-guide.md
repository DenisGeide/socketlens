# Contributor Guide

This guide is for contributors who want to add to SocketLens without rewriting the core.

Start with:

```bash
npm install
npm run dev
```

For the local echo server:

```bash
npm run dev:echo
```

For the native desktop app and Proxy Mode:

```bash
npm run dev:desktop
```

Desktop mode requires Rust/Cargo and Tauri platform prerequisites.

## Where To Start

| Goal | Start here |
| --- | --- |
| UI panel or visual polish | `apps/desktop/src/components` |
| Packet model or session file shape | `apps/desktop/src/models` |
| Packet decoder/analyzer/filter/exporter | `apps/desktop/src/extensions` |
| Direct WebSocket behavior | `apps/desktop/src/store/connection-store.ts` |
| Packet batching/retention | `apps/desktop/src/store/packet-store.ts` |
| Session lifecycle | `apps/desktop/src/store/session-store.ts` |
| Settings persistence | `apps/desktop/src/store/settings-store.ts`, `apps/desktop/src/lib/settings-persistence.ts` |
| AI provider | `apps/desktop/src/extensions/ai-provider.ts`, `apps/desktop/src/lib/ai` |
| Tauri command bridge | `apps/desktop/src/lib/tauri-commands.ts` |
| Rust proxy | `apps/desktop/src-tauri/src/proxy.rs` |

## Architecture Rules

- Keep captured packet payloads immutable.
- Keep demo logic under `apps/desktop/src/demo`.
- Keep extension contracts under `apps/desktop/src/extensions`.
- Keep browser/Tauri APIs out of React components unless the component is a small adapter UI.
- Keep direct WebSocket mode separate from Rust proxy mode.
- Keep AI optional and disabled by default.
- Do not add placeholder UI that claims unsupported behavior works.

## Adding A New Packet Decoder

1. Create a decoder in `apps/desktop/src/extensions`.
2. Implement `PacketDecoder`.
3. Add tests for event name, preview, tags, invalid payloads, and expected metadata.
4. Add it to the decoder list used by `decodePacket()`.
5. Verify the timeline and inspector still work with normal JSON/text packets.

Minimal example:

```ts
import type { PacketDecoder } from "@/extensions";

export const customPacketDecoder: PacketDecoder = {
  id: "example.decoder.custom",
  label: "Custom decoder",
  canDecode: (packet) => packet.payloadKind === "json" && packet.payload.includes('"customType"'),
  decode: (packet) => {
    const payload = JSON.parse(packet.payload) as { customType?: string };

    return {
      data: payload,
      decoderId: "example.decoder.custom",
      eventName: payload.customType ? `custom.${payload.customType}` : "custom.frame",
      metadata: {},
      payloadKind: "json",
      preview: packet.payload,
      tags: ["json", "custom"],
    };
  },
};
```

Do not add protocol parsing inside `PacketTimeline`, `PayloadInspector`, or stores.

## Adding A New Export Format

1. Implement `ExportAdapter`.
2. Keep file serialization deterministic.
3. Do not change the existing SocketLens session JSON format unless you add versioned migration.
4. Keep native/browser file saving in `lib/session-file-storage.ts`.

Good first export ideas:

- NDJSON packet export,
- compact JSON packet export,
- redacted JSON export.

## Adding A New AI Provider

1. Add provider runtime code under `apps/desktop/src/lib/ai/providers`.
2. Add the provider to `apps/desktop/src/extensions/ai-provider.ts`.
3. Validate settings before network calls.
4. Keep API keys local.
5. Ensure the app works fully when the provider is disabled.

## Adding A New Filter

1. Add state to `FilterState` only if the filter should be global.
2. Add matching behavior to `defaultFilterEngine`.
3. Update tests.
4. Add UI controls in `PacketTimeline`.

If the filter is panel-specific, keep it local to that panel instead.

## Manual QA

Before opening a PR or handing work back:

```bash
npm run typecheck
npm run test
npm run build
```

Full local check:

```bash
npm run check
```

Manual smoke test:

1. Start `npm run dev`.
2. Start Investor Demo.
3. Select a packet and inspect Pretty/Raw/Metadata.
4. Start `npm run dev:echo`.
5. Connect Direct Mode to `ws://127.0.0.1:17787`.
6. Send `{"command":"ping"}`.
7. Confirm outbound and inbound packets appear.
8. In desktop mode, test Proxy Mode only if Rust/Tauri prerequisites are installed.

## Good First Issues

- Add tests for packet decoder edge cases.
- Improve one UI panel without changing stores.
- Add a small packet analyzer rule.
- Add a safe export adapter.
- Improve docs where current commands or architecture are unclear.
