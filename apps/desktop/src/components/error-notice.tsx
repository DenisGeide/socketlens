import { useState } from "react";
import { AlertCircle, Clipboard, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { UserFacingError } from "@/lib/user-facing-errors";

type ErrorNoticeProps = {
  className?: string;
  error: Pick<UserFacingError, "message" | "suggestion" | "technicalDetails" | "title">;
};

export function ErrorNotice({ className = "", error }: ErrorNoticeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const canCopyDetails = error.technicalDetails.trim().length > 0;

  async function handleCopyDetails() {
    if (!canCopyDetails) {
      return;
    }

    try {
      await navigator.clipboard.writeText(error.technicalDetails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={["rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive", className].join(" ")}>
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="sl-heading font-semibold">{error.title}</p>
          <p className="sl-copy mt-1 text-destructive/90">{error.message}</p>
        </div>
      </div>
      {error.suggestion ? (
        <p className="sl-copy mt-2 flex items-start gap-2 rounded border border-border/60 bg-background/35 px-2 py-1.5 text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
          <span>{error.suggestion}</span>
        </p>
      ) : null}
      {canCopyDetails ? (
        <div className="mt-2">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleCopyDetails}>
            <Clipboard className="h-4 w-4" />
            {copied ? t("errors.copiedDetails") : t("errors.copyDetails")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
