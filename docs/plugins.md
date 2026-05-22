# Local Plugin Foundations

SocketLens has a lightweight source-level plugin registry for contributors who want to group extension capabilities without rewriting core UI, stores, capture logic, or session persistence.

Status: foundation only.

There is no remote plugin execution, no marketplace, no automatic package discovery, and no dynamic loading from installed npm packages.

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

`source` must be `"local"`. The registry rejects non-local plugins.

## Built-In Core Plugin

`socketLensCorePlugin` exposes built-in SocketLens capabilities:

- default decoders,
- default analyzer,
- default filter engine,
- built-in JSON export adapters.

It is enabled by default so tests and future integrations can use the same registry path as local extensions.

## When To Add A Plugin

Use a plugin when a contribution bundles multiple local extension capabilities.

Good examples:

- a protocol decoder plus analyzer,
- an exporter plus filter preset engine,
- a source-level experiment that should be disabled by default.

Do not use plugins for:

- UI rewrites,
- socket lifecycle changes,
- Tauri/Rust backend commands,
- remote code loading,
- telemetry,
- marketplace infrastructure,
- account/cloud systems.

## Example Plugin

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

const registry = createPluginRegistry([examplePlugin], {
  enabledPlugins: {
    "example.plugin.local": true,
  },
});

const decoded = registry.getDecoderRegistry().decode(packet);
```

## Enable And Disable

Plugins can be controlled through `PluginRegistry`:

```ts
registry.enable("example.plugin.local");
registry.disable("example.plugin.local");
registry.setEnabled("example.plugin.local", true);
```

Enablement is local runtime state. It is not cloud sync.

## Safety Boundaries

Plugins should:

- return typed extension objects only,
- avoid direct store access,
- avoid socket/file/Tauri access,
- avoid React state,
- keep payload parsing pure,
- fail through fallback behavior instead of crashing the UI.

Plugins should not:

- load remote code,
- download code from a marketplace,
- execute user-provided scripts,
- make network calls during registration,
- log captured payloads or secrets.

## Testing Expectations

Every plugin should include tests that prove:

- it is disabled when expected,
- it registers its capabilities,
- enable/disable works,
- malformed packets do not crash,
- raw fallback behavior still works,
- existing core packets still decode/filter/export.

Run:

```bash
npm run test --workspace @socketlens/desktop
npm run check
```

## Related Guides

- [extension-points.md](extension-points.md)
- [adding-a-decoder.md](adding-a-decoder.md)
- [adding-a-filter.md](adding-a-filter.md)
