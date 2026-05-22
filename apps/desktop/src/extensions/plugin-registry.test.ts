import { describe, expect, it } from "vitest";
import {
  createPluginRegistry,
  PluginRegistry,
  type DecodedPacket,
  type ExportAdapter,
  type FilterEngine,
  type PacketAnalyzer,
  type PacketDecoder,
  type SocketLensPlugin,
} from "@/extensions";
import { inferPayloadKind, type Packet } from "@/models";

describe("plugin registry", () => {
  it("registers a disabled local plugin only after explicit enablement", () => {
    const plugin = createExamplePlugin();
    const registry = createPluginRegistry([plugin]);
    const packet = createPacketFixture({
      payload: "example:hello",
      payloadKind: "text",
    });

    expect(registry.isEnabled(plugin.id)).toBe(false);
    expect(registry.getDecoders().map((decoder) => decoder.id)).not.toContain("example.decoder.text-prefix");
    expect(registry.getDecoderRegistry().decode(packet)).toMatchObject({
      decoderId: "socketlens.decoder.text",
      eventName: "text.frame",
    });

    registry.enable(plugin.id);

    expect(registry.getDecoders().map((decoder) => decoder.id)).toContain("example.decoder.text-prefix");
    expect(registry.getAnalyzers().map((analyzer) => analyzer.id)).toContain("example.analyzer");
    expect(registry.getFilters().map((filter) => filter.id)).toContain("example.filter");
    expect(registry.getExporters().map((exporter) => exporter.id)).toContain("example.exporter");
    expect(registry.getDecoderRegistry().decode(packet)).toMatchObject({
      decoderId: "example.decoder.text-prefix",
      eventName: "example.frame",
      metadata: {
        protocol: "example",
      },
    });
  });

  it("supports explicit disablement for default-enabled plugins", () => {
    const plugin = {
      ...createExamplePlugin(),
      enabledByDefault: true,
      id: "example.plugin.enabled",
    };
    const registry = createPluginRegistry([plugin], {
      enabledPlugins: {
        "example.plugin.enabled": false,
      },
    });

    expect(registry.isEnabled(plugin.id)).toBe(false);
    registry.enable(plugin.id);
    expect(registry.isEnabled(plugin.id)).toBe(true);
    registry.disable(plugin.id);
    expect(registry.isEnabled(plugin.id)).toBe(false);
  });

  it("rejects duplicate, unknown, and non-local plugin registration", () => {
    const plugin = createExamplePlugin();
    const registry = new PluginRegistry([plugin]);

    expect(() => registry.register(plugin)).toThrow(/already registered/);
    expect(() => registry.enable("missing.plugin")).toThrow(/Unknown plugin/);
    expect(
      () =>
        new PluginRegistry([
          {
            ...plugin,
            id: "remote.plugin",
            source: "remote",
          } as unknown as SocketLensPlugin,
        ]),
    ).toThrow(/local source-level plugins/);
  });
});

function createExamplePlugin(): SocketLensPlugin {
  const decoder: PacketDecoder = {
    canDecode: (packet) => packet.payloadKind === "text" && packet.payload.startsWith("example:"),
    decode: (packet): DecodedPacket => ({
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
    id: "example.decoder.text-prefix",
    label: "Example text prefix decoder",
    priority: 95,
  };
  const analyzer: PacketAnalyzer = {
    analyze: (_packet, decoded) => ({
      eventName: decoded?.eventName ?? "example.frame",
      preview: decoded?.preview ?? "example",
      status: "ok",
    }),
    id: "example.analyzer",
    label: "Example analyzer",
  };
  const filter: FilterEngine = {
    apply: (packets) => packets,
    getSearchText: (packet) => packet.payload,
    id: "example.filter",
    label: "Example filter",
    matches: () => true,
  };
  const exporter: ExportAdapter = {
    canExport: () => false,
    createFile: () => {
      throw new Error("Example exporter is documentation-only.");
    },
    extension: "example.json",
    getSuggestedFileName: () => "example.json",
    id: "example.exporter",
    label: "Example exporter",
    mimeType: "application/json",
    serialize: () => "",
  };

  return {
    capabilities: {
      analyzers: [analyzer],
      decoders: [decoder],
      exporters: [exporter],
      filters: [filter],
    },
    description: "Disabled-by-default local example plugin for tests and documentation.",
    enabledByDefault: false,
    id: "example.plugin.local",
    label: "Example Local Plugin",
    source: "local",
  };
}

function createPacketFixture(packet: Partial<Packet> & Pick<Packet, "payload">): Packet {
  return {
    connectionId: "connection-a",
    direction: "inbound",
    id: "packet-a",
    payloadKind: inferPayloadKind(packet.payload),
    sessionId: "session-a",
    sizeBytes: new TextEncoder().encode(packet.payload).byteLength,
    timestamp: 1000,
    ...packet,
  };
}
