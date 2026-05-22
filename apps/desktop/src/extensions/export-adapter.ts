import {
  createPacketExportFile,
  createSessionFile,
  getSuggestedPacketExportFileName,
  getSuggestedSessionFileName,
  serializeSocketLensFile,
  type SocketLensImportableFile,
  type SocketLensPacketExportFile,
  type SocketLensSessionFile,
} from "@/models";
import type { ExportAdapter, ExportAdapterInput } from "@/extensions/types";

const jsonMimeType = "application/json;charset=utf-8";

export const socketLensSessionExportAdapter: ExportAdapter = {
  canExport: (input) => input.session !== null,
  createFile: (input) => {
    if (!input.session) {
      throw new Error("A session is required to create a SocketLens session file.");
    }

    return createSessionFile({
      packets: input.packets,
      session: input.session,
      sessionName: input.sessionName,
    });
  },
  extension: "socketlens-session.json",
  getSuggestedFileName: (file) => getSuggestedSessionFileName(file as SocketLensSessionFile),
  id: "socketlens.export.session-json",
  label: "SocketLens session JSON",
  mimeType: jsonMimeType,
  serialize: serializeSocketLensFile,
};

export const socketLensPacketExportAdapter: ExportAdapter = {
  canExport: (input) => input.packets.length > 0,
  createFile: (input) =>
    createPacketExportFile({
      packets: input.packets,
      session: input.session,
      sessionName: input.sessionName,
    }),
  extension: "socketlens-packets.json",
  getSuggestedFileName: (file) => getSuggestedPacketExportFileName(file as SocketLensPacketExportFile),
  id: "socketlens.export.packets-json",
  label: "SocketLens packet export JSON",
  mimeType: jsonMimeType,
  serialize: serializeSocketLensFile,
};

export const defaultExportAdapters = [
  socketLensSessionExportAdapter,
  socketLensPacketExportAdapter,
] as const satisfies ExportAdapter[];

export function createExportFile(adapter: ExportAdapter, input: ExportAdapterInput): SocketLensImportableFile {
  if (!adapter.canExport(input)) {
    throw new Error(`${adapter.label} cannot export the provided input.`);
  }

  return adapter.createFile(input);
}
