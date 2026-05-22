import { Github } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { appMetadata } from "@/config/app-metadata";
import { openExternalUrl } from "@/lib/open-external-url";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { cn } from "@/lib/utils";

export function GitHubStarButton() {
  const { t } = useTranslation();
  const hasCount = appMetadata.github.starsDisplay.length > 0;

  function handleStarClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isTauriRuntime()) {
      return;
    }

    event.preventDefault();
    void openExternalUrl(appMetadata.github.repositoryUrl);
  }

  return (
    <div
      className={cn(
        "inline-flex h-7 overflow-hidden rounded-md border border-border/80 bg-[#f6f8fa] text-[0.72rem] font-medium text-[#24292f] shadow-sm transition focus-within:ring-2 focus-within:ring-ring hover:border-[#afb8c1] dark:border-border/80 dark:bg-muted/80 dark:text-foreground dark:hover:border-primary/35",
        hasCount ? "divide-x divide-[#d0d7de] dark:divide-border/80" : "",
      )}
      title={t("github.starTooltip")}
    >
      <a
        href={appMetadata.github.repositoryUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-full items-center gap-1.5 px-2.5 outline-none transition hover:bg-[#ebf0f4] focus-visible:bg-[#ebf0f4] dark:hover:bg-muted dark:focus-visible:bg-muted"
        aria-label={t("github.starTooltip")}
        onClick={handleStarClick}
      >
        <Github className="h-3.5 w-3.5" />
        {t("github.star")}
      </a>
      {hasCount ? (
        <span className="hidden h-full items-center px-2.5 tabular-nums text-[#24292f] 2xl:inline-flex dark:text-foreground">
          {appMetadata.github.starsDisplay}
        </span>
      ) : null}
    </div>
  );
}
