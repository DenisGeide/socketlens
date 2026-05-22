import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clipboard, Info, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ToastNotification } from "@/store/ui-store";

type ToastViewportProps = {
  onDismissToast: (toastId: string) => void;
  toasts: ToastNotification[];
};

export function ToastViewport({ onDismissToast, toasts }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} onDismissToast={onDismissToast} toast={toast} />
      ))}
    </div>
  );
}

type ToastItemProps = {
  onDismissToast: (toastId: string) => void;
  toast: ToastNotification;
};

function ToastItem({ onDismissToast, toast }: ToastItemProps) {
  const { t } = useTranslation();
  const [copiedDetails, setCopiedDetails] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismissToast(toast.id), toast.timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [onDismissToast, toast.id, toast.timeoutMs]);

  const Icon = toastIconByLevel[toast.level];
  const hasDetails = toast.details !== null && toast.details.trim().length > 0;

  async function handleCopyDetails() {
    if (!hasDetails || toast.details === null) {
      return;
    }

    try {
      await navigator.clipboard.writeText(toast.details);
      setCopiedDetails(true);
      window.setTimeout(() => setCopiedDetails(false), 1_500);
    } catch {
      setCopiedDetails(false);
    }
  }

  return (
    <div className="pointer-events-auto rounded-lg border border-border/80 bg-panel/95 p-3 shadow-2xl backdrop-blur">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
        <Icon className={["mt-0.5 h-4 w-4", toastIconToneByLevel[toast.level]].join(" ")} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{toast.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{toast.message}</p>
          {hasDetails ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={handleCopyDetails}>
              <Clipboard className="h-4 w-4" />
              {copiedDetails ? t("errors.copiedDetails") : t("errors.copyDetails")}
            </Button>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" aria-label={t("toast.dismiss")} onClick={() => onDismissToast(toast.id)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const toastIconByLevel = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
} satisfies Record<ToastNotification["level"], typeof Info>;

const toastIconToneByLevel = {
  error: "text-destructive",
  info: "text-primary",
  success: "text-emerald-300",
  warning: "text-amber-300",
} satisfies Record<ToastNotification["level"], string>;
