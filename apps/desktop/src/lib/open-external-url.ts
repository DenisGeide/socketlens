import { isTauriRuntime } from "@/lib/tauri-runtime";

export async function openExternalUrl(url: string) {
  if (isTauriRuntime()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      // Fall through to the browser fallback so web/dev mode still behaves predictably.
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
