import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Eye, FileJson, Info, Save, ShieldCheck, ShieldOff, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/error-notice";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { createTechnicalDetails, createUserFacingError, type UserFacingError } from "@/lib/user-facing-errors";
import {
  createSessionRedactionPreview,
  normalizeCustomRedactionRules,
  type Packet,
  type Session,
  type SessionRedactionOptions,
} from "@/models";

type SessionFileActionOptions = {
  redaction?: SessionRedactionOptions;
};

type SessionPersistencePanelProps = {
  currentSession: Session | null;
  currentSessionPackets: Packet[];
  onExportAsyncApiDraft: (sessionName: string, options?: SessionFileActionOptions) => Promise<void>;
  onExportPackets: (sessionName: string, options?: SessionFileActionOptions) => Promise<void>;
  onImportBrowserFile: (file: File) => Promise<void>;
  onLoadSessionFile: () => Promise<void>;
  onSaveSession: (sessionName: string, options?: SessionFileActionOptions) => Promise<void>;
};

type FileOperation = "asyncapi" | "export" | "save";
type PendingOperation = FileOperation | "load" | null;

export function SessionPersistencePanel({
  currentSession,
  currentSessionPackets,
  onExportAsyncApiDraft,
  onExportPackets,
  onImportBrowserFile,
  onLoadSessionFile,
  onSaveSession,
}: SessionPersistencePanelProps) {
  const { t } = useTranslation();
  const browserFileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [customRulesText, setCustomRulesText] = useState("");
  const [pendingOperation, setPendingOperation] = useState<PendingOperation>(null);
  const [redactionEnabled, setRedactionEnabled] = useState(true);
  const [sessionName, setSessionName] = useState(currentSession?.name ?? "");
  const [unsafeOperation, setUnsafeOperation] = useState<FileOperation | null>(null);
  const hasPackets = currentSessionPackets.length > 0;
  const hasSession = currentSession !== null;
  const isNativeStorage = isTauriRuntime();
  const customRules = useMemo(() => normalizeCustomRedactionRules(customRulesText), [customRulesText]);
  const redactionPreview = useMemo(
    () =>
      createSessionRedactionPreview({
        customRules,
        packets: currentSessionPackets,
        session: currentSession,
      }),
    [currentSession, currentSessionPackets, customRules],
  );
  const hasInvalidRules = redactionPreview.invalidCustomRules.length > 0;
  const redactionOptions = useMemo<SessionRedactionOptions>(
    () => ({
      customRules,
      enabled: redactionEnabled,
    }),
    [customRules, redactionEnabled],
  );
  const fileActionsDisabled = pendingOperation !== null || (redactionEnabled && hasInvalidRules);

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

  function handleFileOperation(operation: FileOperation) {
    if (!redactionEnabled && redactionPreview.sensitiveDataDetected) {
      setUnsafeOperation(operation);
      return;
    }

    void runFileOperation(operation, redactionOptions);
  }

  function handleConfirmUnsafeExport() {
    if (!unsafeOperation) {
      return;
    }

    const operation = unsafeOperation;
    setUnsafeOperation(null);
    void runFileOperation(operation, {
      ...redactionOptions,
      enabled: false,
    });
  }

  function runFileOperation(operation: FileOperation, options: SessionRedactionOptions) {
    return runOperation(operation, () => {
      if (operation === "save") {
        return onSaveSession(sessionName, { redaction: options });
      }

      if (operation === "asyncapi") {
        return onExportAsyncApiDraft(sessionName, { redaction: options });
      }

      return onExportPackets(sessionName, { redaction: options });
    });
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

      <div className="mt-3 rounded-md border border-amber-500/35 bg-amber-500/10 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("sessions.redaction.warningTitle")}
            </p>
            <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">
              {t("sessions.redaction.warningDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant={redactionEnabled ? "secondary" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => {
              setRedactionEnabled((enabled) => !enabled);
              setUnsafeOperation(null);
            }}
          >
            {redactionEnabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            {redactionEnabled ? t("sessions.redaction.enabled") : t("sessions.redaction.disabled")}
          </Button>
        </div>

        <p className="mt-2 text-[0.72rem] leading-4 text-muted-foreground">
          {t("sessions.redaction.exportCopyOnly")}
        </p>
      </div>

      <div className="mt-3 space-y-2 rounded-md border border-border/70 bg-background/45 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {t("sessions.redaction.preview")}
          </p>
          <Badge variant={redactionPreview.sensitiveDataDetected ? "default" : "outline"}>
            {t("sessions.redaction.previewStats", {
              packets: redactionPreview.redactedPacketCount,
              replacements: redactionPreview.replacements,
              total: redactionPreview.packetCount,
            })}
          </Badge>
        </div>

        {redactionPreview.previewPacket ? (
          <pre className="max-h-28 overflow-auto rounded-md border border-border/70 bg-background p-2 text-[0.68rem] leading-4 text-foreground">
            {redactionPreview.previewPacket.after}
          </pre>
        ) : (
          <p className="rounded-md border border-dashed border-border/70 p-2 text-[0.72rem] leading-4 text-muted-foreground">
            {t("sessions.redaction.noPreview")}
          </p>
        )}

        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("sessions.redaction.customRules")}
          <Textarea
            className="min-h-16 resize-y font-mono text-[0.72rem]"
            disabled={pendingOperation !== null}
            placeholder={t("sessions.redaction.customRulesPlaceholder")}
            value={customRulesText}
            spellCheck={false}
            onChange={(event) => setCustomRulesText(event.target.value)}
          />
        </label>
        <p className="text-[0.72rem] leading-4 text-muted-foreground">
          {t("sessions.redaction.customRulesHint")}
        </p>

        {hasInvalidRules ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[0.72rem] leading-4 text-destructive-foreground">
            {t("sessions.redaction.invalidRules", {
              rules: redactionPreview.invalidCustomRules.join(", "),
            })}
          </p>
        ) : null}
      </div>

      {unsafeOperation ? (
        <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-2.5">
          <p className="text-xs font-semibold text-destructive-foreground">
            {t("sessions.redaction.confirmUnsafeTitle")}
          </p>
          <p className="mt-1 text-[0.72rem] leading-4 text-muted-foreground">
            {t("sessions.redaction.confirmUnsafeDescription")}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUnsafeOperation(null)}
            >
              {t("sessions.redaction.cancelUnsafe")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmUnsafeExport}
            >
              {t("sessions.redaction.confirmUnsafeAction")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasSession || fileActionsDisabled}
          onClick={() => handleFileOperation("save")}
        >
          <Save className="h-4 w-4" />
          {t("actions.save")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPackets || fileActionsDisabled}
          onClick={() => handleFileOperation("export")}
        >
          <Download className="h-4 w-4" />
          {t("sessions.files.export")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPackets || fileActionsDisabled}
          title={t("sessions.files.asyncApiExperimental")}
          onClick={() => handleFileOperation("asyncapi")}
        >
          <FileJson className="h-4 w-4" />
          {t("sessions.files.exportAsyncApi")}
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
