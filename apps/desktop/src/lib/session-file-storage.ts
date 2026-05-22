import {
  parseSocketLensFile,
  serializeSocketLensFile,
  type SocketLensImportableFile,
} from "@/models";
import { isTauriRuntime } from "@/lib/tauri-runtime";

export type SessionFileStorageMode = "browser-download" | "browser-upload" | "tauri";

export type SaveSessionFileResult =
  | {
      cancelled: false;
      mode: SessionFileStorageMode;
      target: string;
    }
  | {
      cancelled: true;
      mode: "tauri";
    };

export type LoadSessionFileResult =
  | {
      cancelled: false;
      file: SocketLensImportableFile;
      mode: SessionFileStorageMode;
      sourceName: string;
    }
  | {
      cancelled: true;
      mode: "tauri";
    };

const jsonMimeType = "application/json;charset=utf-8";
const socketLensJsonFilter = [
  {
    extensions: ["json"],
    name: "SocketLens JSON",
  },
];

export async function saveSocketLensFile(
  file: SocketLensImportableFile,
  suggestedFileName: string,
): Promise<SaveSessionFileResult> {
  const contents = serializeSocketLensFile(file);

  if (isTauriRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const selectedPath = await save({
      defaultPath: suggestedFileName,
      filters: socketLensJsonFilter,
      title: "Save SocketLens session",
    });

    if (!selectedPath) {
      return {
        cancelled: true,
        mode: "tauri",
      };
    }

    await writeTextFile(selectedPath, contents);

    return {
      cancelled: false,
      mode: "tauri",
      target: selectedPath,
    };
  }

  downloadBrowserFile(contents, suggestedFileName);

  return {
    cancelled: false,
    mode: "browser-download",
    target: suggestedFileName,
  };
}

export async function loadSocketLensFileFromTauriDialog(): Promise<LoadSessionFileResult> {
  const [{ open }, { readTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPath = await open({
    directory: false,
    filters: socketLensJsonFilter,
    multiple: false,
    title: "Load SocketLens session",
  });

  if (!selectedPath || Array.isArray(selectedPath)) {
    return {
      cancelled: true,
      mode: "tauri",
    };
  }

  const contents = await readTextFile(selectedPath);
  const parsed = parseSocketLensFile(contents);

  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return {
    cancelled: false,
    file: parsed.file,
    mode: "tauri",
    sourceName: getFileNameFromPath(selectedPath),
  };
}

export async function loadSocketLensFileFromBrowserFile(file: File): Promise<LoadSessionFileResult> {
  const contents = await file.text();
  const parsed = parseSocketLensFile(contents);

  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  return {
    cancelled: false,
    file: parsed.file,
    mode: "browser-upload",
    sourceName: file.name,
  };
}

function downloadBrowserFile(contents: string, fileName: string) {
  const blob = new Blob([contents], { type: jsonMimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function getFileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
