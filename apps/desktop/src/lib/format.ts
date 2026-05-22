import { getCurrentAppLocale } from "@/i18n";

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat(getUserLocale(), { maximumFractionDigits: 1 }).format(value)} ${
    units[unitIndex] ?? "KB"
  }`;
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(getUserLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(getUserLocale(), {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
  }).format(timestamp);
}

export function formatDuration(startedAt: number, endedAt: number | null) {
  const durationMs = Math.max((endedAt ?? Date.now()) - startedAt, 0);
  const seconds = Math.floor(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

function getUserLocale() {
  return getCurrentAppLocale();
}
