import type {
  AppAiProvider,
  AppAiProviderSettings,
  FilterState,
  Packet,
  PacketPayloadKind,
  ReplayHistoryItem,
  Session,
  SocketLensImportableFile,
} from "@/models";
import type {
  AiAnalysisInput,
  AiAnalysisResult,
  AiProviderResult,
  AiProviderValidation,
} from "@/lib/ai/types";

export type ExtensionId = string;

export type PacketStatus =
  | "ai"
  | "auth"
  | "chat"
  | "error"
  | "heartbeat"
  | "notification"
  | "ok"
  | "presence"
  | "reconnect"
  | "replay";

export type PacketSummary = {
  eventName: string;
  preview: string;
  status: PacketStatus;
};

export type DecodedPacket = {
  data: unknown;
  decoderId: ExtensionId;
  eventName: string;
  metadata: Record<string, boolean | number | string | null>;
  payloadKind: PacketPayloadKind;
  preview: string;
  tags: string[];
};

export type PacketDecoder = {
  canDecode: (packet: Packet) => boolean;
  decode: (packet: Packet) => DecodedPacket;
  id: ExtensionId;
  label: string;
};

export type PacketAnalyzer = {
  analyze: (packet: Packet, decoded?: DecodedPacket) => PacketSummary;
  id: ExtensionId;
  label: string;
};

export type FilterEngine = {
  apply: (packets: Packet[], filterState: FilterState) => Packet[];
  getSearchText: (packet: Packet) => string;
  id: ExtensionId;
  label: string;
  matches: (packet: Packet, filterState: FilterState) => boolean;
};

export type ExportAdapterInput = {
  packets: Packet[];
  session: Session | null;
  sessionName?: string;
};

export type ExportAdapter = {
  canExport: (input: ExportAdapterInput) => boolean;
  createFile: (input: ExportAdapterInput) => SocketLensImportableFile;
  extension: string;
  getSuggestedFileName: (file: SocketLensImportableFile) => string;
  id: ExtensionId;
  label: string;
  mimeType: string;
  serialize: (file: SocketLensImportableFile) => string;
};

export type AIProvider = {
  analyze: (settings: AppAiProviderSettings, input: AiAnalysisInput) => Promise<AiProviderResult<AiAnalysisResult>>;
  id: Exclude<AppAiProvider, "disabled">;
  label: string;
  privacyBoundary: "local" | "external";
  validateConfiguration: (settings: AppAiProviderSettings) => AiProviderValidation;
};

export type ReplayStrategyInput = {
  activeSession: Session | null;
  isConnected: boolean;
  packet: Packet | null;
  payloadOverride?: string;
};

export type ReplayStrategyResult =
  | {
      historyItem: ReplayHistoryItem | null;
      ok: true;
      payload: string;
      sourcePacketId: string | null;
    }
  | {
      code: "connection_required" | "missing_packet" | "unsupported_packet";
      message: string;
      ok: false;
    };

export type ReplayStrategy = {
  id: ExtensionId;
  label: string;
  prepare: (input: ReplayStrategyInput) => ReplayStrategyResult;
};
