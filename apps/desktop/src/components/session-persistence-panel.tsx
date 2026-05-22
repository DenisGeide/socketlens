import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, FileJson, Info, Save, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import type { Packet, Session } from "@/models";

type SessionPersistencePanelProps = {
  currentSession: Session | null;
  currentSessionPackets: Packet[];
  onExportPackets: (sessionName: string) => Promise<void>;
  onImportBrowserFile: (file: File) => Promise<void>;
  onLoadSessionFile: () => Promise<void>;
  onSaveSession: (sessionName: string) => Promise<void>;
};

type PendingOperation = "export" | "load" | "save" | null;

export function SessionPersistencePanel({
  currentSession,
  currentSessionPackets,
  onExportPackets,
  onImportBrowserFile,
  onLoadSessionFile,
  onSaveSession,
}: SessionPersistencePanelProps) {
  const { t } = useTranslation();
  const browserFileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation>(null);
  const [sessionName, setSessionName] = useState(currentSession?.name ?? "");
  const hasPackets = currentSessionPackets.length > 0;
  const hasSession = currentSession !== null;
  const isNativeStorage = isTauriRuntime();

  useEffect(() => {
    setSessionName(currentSession?.name ?? "");
  }, [currentSession?.id, currentSession?.name]);

  async function runOperation(operation: PendingOperation, action: () => Promise<void>) {
    setError(null);
    setPendingOperation(operation);

    try {
      await action();
    } catch (nextError) {
      setError(
        createUserFacingError("localFile", t, {
          message: getFriendlyErrorMessage(nextError, t("sessions.errors.operationFailed")),
          technicalDetails: createTechnicalDetails("Session file operation failed", {
            operation,
            error: nextError instanceof Error ? nextError.message : String(nextError),
          }),
          title: t("sessions.errors.operationFailedTitle"),
        }),
      );
    } finally {
      setPendingOperation(null);
    }
  }

  function handleLoadClick() {
    if (isNativeStorage) {
      void runOperation("load", onLoadSessionFile);
      return;
    }

    browserFileInputRef.current?.click();
  }

  function handleBrowserFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0) ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    void runOperation("load", () => onImportBrowserFile(file));
  }

  return (
    <div className="rounded-md border border-border/80 bg-muted/20 p-2.5">
      <input
        ref={browserFileInputRef}
        accept=".json,.socketlens-session.json,.socketlens-packets.json,application/json"
        className="hidden"
        data-testid="session-file-input"
        type="file"
        onChange={handleBrowserFileChange}
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <FileJson className="h-3.5 w-3.5" />
            {t("sessions.files.title")}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {currentSession ? currentSession.endpointUrl : t("sessions.files.description")}
          </p>
        </div>
        <Badge variant="outline">{t("sessions.files.packetCount", { count: currentSessionPackets.length })}</Badge>
      </div>

      <label className="space-y-2 text-xs font-medium text-muted-foreground">
        {t("sessions.files.sessionName")}
        <Input
          disabled={!hasSession || pendingOperation !== null}
          value={sessionName}
          placeholder={t("sessions.files.sessionNamePlaceholder")}
          spellCheck={false}
          onChange={(event) => setSessionName(event.target.value)}
        />
      </label>

      {currentSession ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[0.72rem] text-muted-foreground">
          <span>{t("sessions.files.created", { date: formatDateTime(currentSession.createdAt) })}</span>
          <span className="text-right">{t(`status.${currentSession.status}`, currentSession.status)}</span>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasSession || pendingOperation !== null}
          onClick={() => void runOperation("save", () => onSaveSession(sessionName))}
        >
          <Save className="h-4 w-4" />
          {t("actions.save")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPackets || pendingOperation !== null}
          onClick={() => void runOperation("export", () => onExportPackets(sessionName))}
        >
          <Download className="h-4 w-4" />
          {t("sessions.files.export")}
        </Button>
        <Button variant="ghost" size="sm" disabled={pendingOperation !== null} onClick={handleLoadClick}>
          <Upload className="h-4 w-4" />
          {t("actions.load")}
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[0.72rem] leading-4 text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {isNativeStorage
            ? t("sessions.files.nativeStorage")
            : t("sessions.files.browserStorage")}
        </span>
      </p>

      {error ? <ErrorNotice className="mt-2" error={error} /> : null}
      {pendingOperation ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("sessions.files.working", { operation: t(`sessions.operation.${pendingOperation}`) })}
        </p>
      ) : null}
    </div>
  );
}
