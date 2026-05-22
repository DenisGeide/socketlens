# Local Plugin Foundations

SocketLens has a lightweight source-level plugin registry for contributors who want to add protocol understanding without rewriting core UI, stores, capture logic, or session persistence.

Status: foundation only. There is no remote plugin execution, no marketplace, and no dynamic package loading.

## What A Plugin Can Provide

A local plugin can register:

- packet decoders,
- packet analyzers,
- filter engines,
- export adapters.

The contracts live in:

```text
apps/desktop/src/extensions/types.ts
apps/desktop/src/extensions/plugin-registry.ts
```

## Safety Boundaries

SocketLens plugins are deliberately conservative:

- plugins are local TypeScript source code committed to the repository,
- plugins are registered explicitly,
- plugins can be enabled or disabled explicitly,
- remote code loading is not supported,
- marketplace/plugin download flows are not supported,
- plugins should not access sockets, files, stores, or UI state directly,
- plugins should return typed extension objects only.

The registry rejects non-local plugin sources at runtime.

## Plugin Shape

```ts
export type SocketLensPlugin = {
  capabilities: {
    analyzers?: PacketAnalyzer[];
    decoders?: PacketDecoder[];
    exporters?: ExportAdapter[];
    filters?: FilterEngine[];
  };
  description?: string;
  enabledByDefault: boolean;
  id: string;
  label: string;
  source: "local";
};
```

## Example Plugin

This example plugin adds a tiny text decoder and is disabled by default:

```ts
import type { PacketDecoder, SocketLensPlugin } from "@/extensions";

const exampleDecoder: PacketDecoder = {
  id: "example.decoder.text-prefix",
  label: "Example text prefix decoder",
  priority: 95,
  canDecode: (packet) => packet.payloadKind === "text" && packet.payload.startsWith("example:"),
  decode: (packet) => ({
    data: {
      text: packet.payload.slice("example:".length),
    },
    decoderId: "example.decoder.text-prefix",
    eventName: "example.frame",
    metadata: {
      protocol: "example",
    },
    payloadKind: "text",
    preview: packet.payload,
    tags: ["example"],
  }),
};

export const examplePlugin: SocketLensPlugin = {
  id: "example.plugin.local",
  label: "Example Local Plugin",
  description: "Disabled-by-default local example plugin.",
  enabledByDefault: false,
  source: "local",
  capabilities: {
    decoders: [exampleDecoder],
  },
};
```

Register it explicitly:

```ts
import { createPluginRegistry } from "@/extensions";
import { examplePlugin } from "./example-plugin";

const registry = createPluginRegistry([examplePlugin]);

registry.enable("example.plugin.local");

const decoded = registry.getDecoderRegistry().decode(packet);
```

## Enable And Disable

Plugins can be controlled through `PluginRegistry`:

```ts
registry.enable("example.plugin.local");
registry.disable("example.plugin.local");
registry.setEnabled("example.plugin.local", true);
```

Or with an initial local configuration:

```ts
const registry = createPluginRegistry([examplePlugin], {
  enabledPlugins: {
    "example.plugin.local": true,
  },
});
```

This is intentionally local-only. It is not cloud sync, not a marketplace, and not runtime remote execution.

## Built-in Core Plugin

`socketLensCorePlugin` exposes the built-in SocketLens extensions:

- built-in decoders,
- default analyzer,
- default filter engine,
- built-in JSON export adapters.

It is enabled by default and lets tests or future source-level integrations compose custom plugins with the same registry path.

## When To Add A Plugin

Use a plugin when the contribution is a focused extension:

- a protocol decoder such as Protobuf or MessagePack,
- a protocol-aware analyzer,
- an export format,
- a reusable filter engine.

Do not use plugins for:

- UI rewrites,
- socket lifecycle changes,
- Tauri/Rust backend commands,
- remote code loading,
- telemetry,
- marketplace infrastructure.

## Testing Expectations

Every plugin should include tests that prove:

- it is disabled when expected,
- it registers its capabilities,
- it does not break raw fallback behavior,
- malformed packets do not crash,
- existing packets still decode through the core path.
