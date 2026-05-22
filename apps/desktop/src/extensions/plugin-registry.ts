import {
  DecoderRegistry,
  defaultPacketDecoders,
  fallbackPacketDecoder,
} from "@/extensions/packet-decoder";
import { defaultPacketAnalyzer } from "@/extensions/packet-analyzer";
import { defaultFilterEngine } from "@/extensions/filter-engine";
import { defaultExportAdapters } from "@/extensions/export-adapter";
import type {
  ExportAdapter,
  FilterEngine,
  PacketAnalyzer,
  PacketDecoder,
  SocketLensPlugin,
} from "@/extensions/types";

export type PluginRegistryOptions = {
  enabledPlugins?: Record<string, boolean>;
};

export class PluginRegistry {
  private readonly enablement = new Map<string, boolean>();
  private readonly plugins = new Map<string, SocketLensPlugin>();

  constructor(plugins: SocketLensPlugin[] = [], options: PluginRegistryOptions = {}) {
    for (const plugin of plugins) {
      this.register(plugin);
    }

    for (const [pluginId, enabled] of Object.entries(options.enabledPlugins ?? {})) {
      if (this.plugins.has(pluginId)) {
        this.enablement.set(pluginId, enabled);
      }
    }
  }

  disable(pluginId: string) {
    this.setEnabled(pluginId, false);
  }

  enable(pluginId: string) {
    this.setEnabled(pluginId, true);
  }

  getAnalyzers(): PacketAnalyzer[] {
    return this.getEnabledPlugins().flatMap((plugin) => plugin.capabilities.analyzers ?? []);
  }

  getDecoders(): PacketDecoder[] {
    return this.getEnabledPlugins().flatMap((plugin) => plugin.capabilities.decoders ?? []);
  }

  getDecoderRegistry() {
    return new DecoderRegistry(this.getDecoders(), fallbackPacketDecoder);
  }

  getExporters(): ExportAdapter[] {
    return this.getEnabledPlugins().flatMap((plugin) => plugin.capabilities.exporters ?? []);
  }

  getFilters(): FilterEngine[] {
    return this.getEnabledPlugins().flatMap((plugin) => plugin.capabilities.filters ?? []);
  }

  getEnabledPlugins(): SocketLensPlugin[] {
    return this.getPlugins().filter((plugin) => this.isEnabled(plugin.id));
  }

  getPlugin(pluginId: string) {
    return this.plugins.get(pluginId) ?? null;
  }

  getPlugins(): SocketLensPlugin[] {
    return [...this.plugins.values()];
  }

  isEnabled(pluginId: string) {
    const plugin = this.getRequiredPlugin(pluginId);

    return this.enablement.get(pluginId) ?? plugin.enabledByDefault;
  }

  register(plugin: SocketLensPlugin) {
    validateLocalPlugin(plugin);

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    this.plugins.set(plugin.id, plugin);
  }

  setEnabled(pluginId: string, enabled: boolean) {
    this.getRequiredPlugin(pluginId);
    this.enablement.set(pluginId, enabled);
  }

  private getRequiredPlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Unknown plugin: ${pluginId}`);
    }

    return plugin;
  }
}

export const socketLensCorePlugin: SocketLensPlugin = {
  capabilities: {
    analyzers: [defaultPacketAnalyzer],
    decoders: defaultPacketDecoders,
    exporters: [...defaultExportAdapters],
    filters: [defaultFilterEngine],
  },
  description: "Built-in SocketLens decoders, analyzer, filters, and export adapters.",
  enabledByDefault: true,
  id: "socketlens.plugin.core",
  label: "SocketLens Core",
  source: "local",
};

export const defaultPluginRegistry = new PluginRegistry([socketLensCorePlugin]);

export function createPluginRegistry(plugins: SocketLensPlugin[], options?: PluginRegistryOptions) {
  return new PluginRegistry([socketLensCorePlugin, ...plugins], options);
}

function validateLocalPlugin(plugin: SocketLensPlugin) {
  if (plugin.source !== "local") {
    throw new Error(`SocketLens only supports local source-level plugins: ${plugin.id}`);
  }

  if (!plugin.id.trim()) {
    throw new Error("Plugin id is required.");
  }

  if (!plugin.label.trim()) {
    throw new Error(`Plugin label is required: ${plugin.id}`);
  }
}
