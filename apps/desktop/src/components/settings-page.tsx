import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpenCheck,
  Bot,
  Check,
  CircleOff,
  DatabaseZap,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  MonitorCog,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelContent, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { supportedLanguages } from "@/i18n";
import { fetchOllamaModels, validateAiProviderConfiguration, type OllamaModel } from "@/lib/ai";
import { createTechnicalDetails } from "@/lib/user-facing-errors";
import { translateAiProviderValidationMessage } from "@/lib/validation-messages";
import {
  clampPacketRetentionLimit,
  maxPacketRetentionLimit,
  minPacketRetentionLimit,
  packetRetentionLimitStep,
  type AppAiProvider,
  type AppLanguage,
  type AppSettings,
  type AppTheme,
  redactUrlForDisplay,
} from "@/models";
import { useConnectionStore } from "@/store/connection-store";
import { usePacketStore } from "@/store/packet-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type SettingsPageProps = {
  packetCount: number;
};

const retentionPresets = [10_000, 25_000, 50_000] as const;
const themeValues = ["dark", "light", "system"] satisfies AppTheme[];
const aiProviderValues = ["disabled", "openai-compatible", "ollama"] satisfies AppAiProvider[];

export function SettingsPage({ packetCount }: SettingsPageProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const restartOnboarding = useSettingsStore((state) => state.restartOnboarding);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [aiValidationMessage, setAiValidationMessage] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaModelsError, setOllamaModelsError] = useState<string | null>(null);
  const [ollamaModelsLoading, setOllamaModelsLoading] = useState(false);
  const [packetLimitDraft, setPacketLimitDraft] = useState(String(settings.packetRetentionLimit));
  const languageOptions = supportedLanguages.map((language) => ({ label: language.label, value: language.value }));
  const themeOptions = themeValues.map((value) => ({ label: t(`settings.theme.${value}`), value }));
  const aiProviderOptions = aiProviderValues.map((value) => ({
    label: t(`settings.ai.provider.${value === "openai-compatible" ? "openai" : value}`),
    value,
  }));

  useEffect(() => {
    setPacketLimitDraft(String(settings.packetRetentionLimit));
  }, [settings.packetRetentionLimit]);

  useEffect(() => {
    setOllamaModels([]);
    setOllamaModelsError(null);
  }, [settings.aiProvider.ollama.baseUrl, settings.aiProvider.provider]);

  function patchSettings(patch: Partial<AppSettings>) {
    updateSettings(patch);
    useUiStore.getState().addLog({
      level: "info",
      message: t("settings.messages.updated"),
    });
  }

  function updatePacketRetentionLimit(value: number) {
    const limit = clampPacketRetentionLimit(value);

    patchSettings({ packetRetentionLimit: limit });
    usePacketStore.getState().trimToRetentionLimit();
    setPacketLimitDraft(String(limit));
  }

  function updatePrivacy(patch: Partial<AppSettings["privacy"]>) {
    const nextPrivacy = {
      ...settings.privacy,
      ...patch,
    };

    patchSettings({ privacy: nextPrivacy });

    if (patch.persistRecentConnections === false) {
      useConnectionStore.getState().clearConnectionHistory();
    }
  }

  function updateAiProvider(patch: Partial<AppSettings["aiProvider"]>) {
    patchSettings({
      aiProvider: {
        ...settings.aiProvider,
        ...patch,
      },
    });
    setAiValidationMessage(null);
  }

  function updateOpenAiCompatible(patch: Partial<AppSettings["aiProvider"]["openAiCompatible"]>) {
    patchSettings({
      aiProvider: {
        ...settings.aiProvider,
        openAiCompatible: {
          ...settings.aiProvider.openAiCompatible,
          ...patch,
        },
      },
    });
    setAiValidationMessage(null);
  }

  function updateOllama(patch: Partial<AppSettings["aiProvider"]["ollama"]>) {
    patchSettings({
      aiProvider: {
        ...settings.aiProvider,
        ollama: {
          ...settings.aiProvider.ollama,
          ...patch,
        },
      },
    });
    setAiValidationMessage(null);
  }

  function validateAiSettings() {
    const result = validateAiProviderConfiguration(settings.aiProvider);
    const message = translateAiProviderValidationMessage(result.ok ? result.data.message : result.error.message, t);

    setAiValidationMessage(message);
    useUiStore.getState().addToast({
      level: result.ok ? "success" : "warning",
      message,
      title: result.ok ? t("settings.ai.validTitle") : t("settings.ai.incompleteTitle"),
    });
  }

  async function loadOllamaModels() {
    setOllamaModelsLoading(true);
    setOllamaModelsError(null);

    const result = await fetchOllamaModels(settings.aiProvider.ollama.baseUrl);

    setOllamaModelsLoading(false);

    if (!result.ok) {
      const message =
        result.error.code === "network_error"
          ? t("settings.ai.ollamaModels.errors.unreachable", {
              baseUrl: redactProviderUrl(settings.aiProvider.ollama.baseUrl, t("common.notAvailable")),
            })
          : translateAiProviderValidationMessage(result.error.message, t);

      setOllamaModelsError(message);
      useUiStore.getState().addToast({
        details: createTechnicalDetails("Ollama model list request failed", {
          baseUrl: redactProviderUrl(settings.aiProvider.ollama.baseUrl, t("common.notAvailable")),
          code: result.error.code,
          message: result.error.message,
        }),
        level: "warning",
        message: t("errors.user.aiProviderUnavailable.suggestion"),
        title: t("settings.ai.ollamaModels.errorTitle"),
      });
      return;
    }

    setOllamaModels(result.data);

    if (result.data.length === 0) {
      const message = t("settings.ai.ollamaModels.empty");

      setOllamaModelsError(message);
      useUiStore.getState().addToast({
        level: "warning",
        message,
        title: t("settings.ai.ollamaModels.errorTitle"),
      });
      return;
    }

    if (!settings.aiProvider.ollama.model.trim()) {
      updateOllama({ model: result.data[0]?.name ?? "" });
    }

    useUiStore.getState().addToast({
      level: "success",
      message: t("settings.ai.ollamaModels.count", { count: result.data.length }),
      title: t("settings.ai.ollamaModels.loadedTitle"),
    });
  }

  function handleResetSettings() {
    resetSettings();
    usePacketStore.getState().trimToRetentionLimit();
    useUiStore.getState().addToast({
      level: "info",
      message: t("settings.messages.resetDescription"),
      title: t("settings.messages.reset"),
    });
  }

  function handleRestartOnboarding() {
    restartOnboarding();
    useUiStore.getState().addToast({
      level: "info",
      message: t("settings.onboarding.restartToastMessage"),
      title: t("settings.onboarding.restartToastTitle"),
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader>
        <div>
          <PanelTitle>{t("settings.title")}</PanelTitle>
          <p className="sl-copy mt-1 text-xs text-muted-foreground">{t("settings.description")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleRestartOnboarding}>
            <BookOpenCheck className="h-4 w-4" />
            {t("settings.onboarding.restart")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetSettings}>
            <RotateCcw className="h-4 w-4" />
            {t("actions.reset")}
          </Button>
        </div>
      </PanelHeader>
      <PanelContent className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto grid w-full max-w-4xl content-start gap-3">
          <SettingsSection
            description={t("settings.language.description")}
            icon={Globe2}
            title={t("settings.language.title")}
          >
            <SettingRow label={t("settings.language.label")} value={formatLanguageLabel(settings.language)}>
              <SegmentedControl
                options={languageOptions}
                value={settings.language}
                onChange={(language: AppLanguage) => patchSettings({ language })}
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            description={t("settings.appearance.description")}
            icon={MonitorCog}
            title={t("settings.appearance.title")}
          >
            <SettingRow label={t("settings.theme")} value={t(`settings.theme.${settings.theme}`)}>
              <SegmentedControl
                options={themeOptions}
                value={settings.theme}
                onChange={(theme) => patchSettings({ theme })}
              />
            </SettingRow>
            <SettingToggle
              checked={settings.compactMode}
              description={t("settings.compactMode.description")}
              label={t("settings.compactMode")}
              onChange={(compactMode) => patchSettings({ compactMode })}
            />
            <SettingToggle
              checked={settings.autoScrollDefault}
              description={t("settings.autoScroll.description")}
              label={t("settings.autoScroll")}
              onChange={(autoScrollDefault) => patchSettings({ autoScrollDefault })}
            />
          </SettingsSection>

          <SettingsSection
            description={t("settings.workspace.description")}
            icon={DatabaseZap}
            title={t("settings.workspace.title")}
          >
            <div className="space-y-2.5 rounded-md border border-border/70 bg-background/45 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="sl-heading inline-flex items-center gap-2 text-sm font-medium">
                  <DatabaseZap className="h-4 w-4 text-primary" />
                  {t("settings.packetRetention")}
                </p>
                <Badge variant={packetCount >= settings.packetRetentionLimit ? "outline" : "secondary"}>
                  {packetCount.toLocaleString()} / {settings.packetRetentionLimit.toLocaleString()}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {retentionPresets.map((limit) => (
                  <Button
                    key={limit}
                    variant={settings.packetRetentionLimit === limit ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => updatePacketRetentionLimit(limit)}
                  >
                    {formatCompactLimit(limit)}
                  </Button>
                ))}
              </div>
              <label className="sl-caption space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("settings.packetLimit")}
                <Input
                  min={minPacketRetentionLimit}
                  max={maxPacketRetentionLimit}
                  step={packetRetentionLimitStep}
                  type="number"
                  value={packetLimitDraft}
                  onBlur={() => updatePacketRetentionLimit(Number(packetLimitDraft))}
                  onChange={(event) => setPacketLimitDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <p className="sl-copy text-xs text-muted-foreground">{t("settings.packetRetention.description")}</p>
            </div>
          </SettingsSection>

          <SettingsSection
            description={t("settings.ai.description")}
            icon={Bot}
            title={t("settings.ai.title")}
          >
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.07] p-2.5">
              <p className="sl-heading inline-flex items-center gap-2 text-xs font-semibold text-amber-100">
                <Sparkles className="h-3.5 w-3.5" />
                {t("settings.ai.privacyWarning")}
              </p>
              <p className="sl-copy mt-1.5 text-xs text-amber-50/80">{t("settings.ai.privacyDescription")}</p>
            </div>

            <SettingRow
              label={t("settings.ai.provider")}
              value={t(`settings.ai.provider.${settings.aiProvider.provider === "openai-compatible" ? "openai" : settings.aiProvider.provider}`)}
            >
              <SegmentedControl
                options={aiProviderOptions}
                value={settings.aiProvider.provider}
                onChange={(provider) => updateAiProvider({ provider })}
              />
            </SettingRow>

            {settings.aiProvider.provider === "disabled" ? (
              <div className="rounded-md border border-border/70 bg-muted/15 p-2.5">
                <p className="sl-heading inline-flex items-center gap-2 text-xs font-semibold">
                  <CircleOff className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("settings.ai.disabledTitle")}
                </p>
                <p className="sl-copy mt-1.5 text-xs text-muted-foreground">{t("settings.ai.disabledDescription")}</p>
              </div>
            ) : null}

            {settings.aiProvider.provider === "openai-compatible" ? (
              <div className="space-y-2.5 rounded-md border border-border/70 bg-background/45 p-2.5">
                <TextSetting
                  icon={Server}
                  label={t("settings.ai.baseUrl")}
                  placeholder={t("settings.ai.baseUrlPlaceholder")}
                  value={settings.aiProvider.openAiCompatible.baseUrl}
                  onChange={(baseUrl) => updateOpenAiCompatible({ baseUrl })}
                />
                <TextSetting
                  icon={Sparkles}
                  label={t("settings.ai.model")}
                  placeholder={t("settings.ai.modelPlaceholder")}
                  value={settings.aiProvider.openAiCompatible.model}
                  onChange={(model) => updateOpenAiCompatible({ model })}
                />
                <TextSetting
                  icon={KeyRound}
                  label={t("settings.ai.apiKey")}
                  placeholder={t("settings.ai.apiKeyPlaceholder")}
                  type="password"
                  value={settings.aiProvider.openAiCompatible.apiKey}
                  onChange={(apiKey) => updateOpenAiCompatible({ apiKey })}
                />
              </div>
            ) : null}

            {settings.aiProvider.provider === "ollama" ? (
              <div className="space-y-2.5 rounded-md border border-border/70 bg-background/45 p-2.5">
                <TextSetting
                  icon={Server}
                  label={t("settings.ai.ollamaUrl")}
                  placeholder="http://127.0.0.1:11434"
                  value={settings.aiProvider.ollama.baseUrl}
                  onChange={(baseUrl) => updateOllama({ baseUrl })}
                />
                <OllamaModelSetting
                  error={ollamaModelsError}
                  isLoading={ollamaModelsLoading}
                  placeholder={t("settings.ai.ollamaModelPlaceholder")}
                  models={ollamaModels}
                  value={settings.aiProvider.ollama.model}
                  onRefresh={() => void loadOllamaModels()}
                  onChange={(model) => updateOllama({ model })}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={validateAiSettings}>
                <PlugZap className="h-4 w-4" />
                {t("actions.validateSettings")}
              </Button>
              {aiValidationMessage ? <p className="sl-copy text-xs text-muted-foreground">{aiValidationMessage}</p> : null}
            </div>
          </SettingsSection>

          <SettingsSection
            description={t("settings.privacy.description")}
            icon={ShieldCheck}
            title={t("settings.privacy.title")}
          >
            <PrivacyStatement />
            <SettingToggle
              checked={settings.privacy.persistRecentConnections}
              description={t("settings.privacy.persistConnectionsDescription")}
              label={t("settings.privacy.persistConnections")}
              onChange={(persistRecentConnections) => updatePrivacy({ persistRecentConnections })}
            />
            <SettingToggle
              checked={settings.privacy.showPayloadPreviewInTimeline}
              description={t("settings.privacy.payloadPreviewsDescription")}
              label={t("settings.privacy.payloadPreviews")}
              offIcon={EyeOff}
              onIcon={Eye}
              onChange={(showPayloadPreviewInTimeline) => updatePrivacy({ showPayloadPreviewInTimeline })}
            />
          </SettingsSection>
        </div>
      </PanelContent>
    </div>
  );
}

type SettingsSectionProps = {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
};

function SettingsSection({ children, description, icon: Icon, title }: SettingsSectionProps) {
  return (
    <section className="rounded-md border border-border/80 bg-panel/70 p-3">
      <div className="mb-2.5 flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <h2 className="sl-heading text-sm font-semibold">{title}</h2>
          <p className="sl-copy mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

type SettingRowProps = {
  children: ReactNode;
  label: string;
  value: string;
};

function SettingRow({ children, label, value }: SettingRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="sl-heading text-sm font-medium">{label}</p>
        <Badge variant="secondary">{value}</Badge>
      </div>
      {children}
    </div>
  );
}

type TextSettingProps = {
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "password" | "text";
  value: string;
};

function TextSetting({ icon: Icon, label, onChange, placeholder, type = "text", value }: TextSettingProps) {
  return (
    <label className="sl-caption space-y-1.5 text-xs font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type OllamaModelSettingProps = {
  error: string | null;
  isLoading: boolean;
  models: OllamaModel[];
  onChange: (value: string) => void;
  onRefresh: () => void;
  placeholder: string;
  value: string;
};

function OllamaModelSetting({ error, isLoading, models, onChange, onRefresh, placeholder, value }: OllamaModelSettingProps) {
  const { t } = useTranslation();
  const hasModels = models.length > 0;
  const currentModelInList = models.some((model) => model.name === value);

  return (
    <div className="sl-caption space-y-1.5 text-xs font-medium text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {t("settings.ai.model")}
        </span>
        <Button variant="ghost" size="sm" disabled={isLoading} onClick={onRefresh}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isLoading
            ? t("settings.ai.ollamaModels.loading")
            : hasModels
              ? t("settings.ai.ollamaModels.refresh")
              : t("settings.ai.ollamaModels.load")}
        </Button>
      </div>

      {hasModels ? (
        <select
          className="sl-control flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {t("settings.ai.ollamaModels.selectPlaceholder")}
          </option>
          {value && !currentModelInList ? (
            <option value={value}>{t("settings.ai.ollamaModels.currentManual", { model: value })}</option>
          ) : null}
          {models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>
      ) : (
        <Input value={value} placeholder={placeholder} spellCheck={false} onChange={(event) => onChange(event.target.value)} />
      )}

      <p className="sl-copy text-xs text-muted-foreground">
        {hasModels ? t("settings.ai.ollamaModels.count", { count: models.length }) : t("settings.ai.ollamaModels.hint")}
      </p>
      {error ? (
        <p className="sl-copy rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SegmentedControlProps<Value extends string> = {
  onChange: (value: Value) => void;
  options: Array<{ label: string; value: Value }>;
  value: Value;
};

function SegmentedControl<Value extends string>({ onChange, options, value }: SegmentedControlProps<Value>) {
  return (
    <div
      className="grid gap-1 rounded-md border border-border/70 bg-background/45 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={[
            "sl-button rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === option.value
              ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          ].join(" ")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type SettingToggleProps = {
  checked: boolean;
  description: string;
  label: string;
  offIcon?: LucideIcon;
  onChange: (checked: boolean) => void;
  onIcon?: LucideIcon;
};

function SettingToggle({
  checked,
  description,
  label,
  offIcon: OffIcon = EyeOff,
  onChange,
  onIcon: OnIcon = Check,
}: SettingToggleProps) {
  const Icon = checked ? OnIcon : OffIcon;

  return (
    <button
      type="button"
      aria-pressed={checked}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border border-border/70 bg-background/45 p-2.5 text-left transition hover:border-border hover:bg-muted/25"
      onClick={() => onChange(!checked)}
    >
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-md border",
          checked ? "border-primary/35 bg-primary/10 text-primary" : "border-border/70 bg-muted/20 text-muted-foreground",
        ].join(" ")}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="sl-heading block text-sm font-medium">{label}</span>
        <span className="sl-copy mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={[
          "h-5 w-9 rounded-full border p-0.5 transition",
          checked ? "border-primary/40 bg-primary/30" : "border-border bg-muted/30",
        ].join(" ")}
      >
        <span
          className={[
            "block h-3.5 w-3.5 rounded-full bg-foreground transition",
            checked ? "translate-x-4 bg-primary" : "translate-x-0 bg-muted-foreground",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function PrivacyStatement() {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-primary/20 bg-primary/[0.07] p-2.5">
      <p className="sl-heading text-xs font-semibold text-primary">{t("settings.privacy.localFirst")}</p>
      <p className="sl-copy mt-1.5 text-xs text-foreground/80">{t("settings.privacy.localFirstDescription")}</p>
    </div>
  );
}

function formatLanguageLabel(language: AppLanguage) {
  return supportedLanguages.find((item) => item.value === language)?.label ?? language;
}

function formatCompactLimit(limit: number) {
  return `${Math.round(limit / 1_000)}k`;
}

function redactProviderUrl(value: string, fallback: string) {
  const trimmedValue = value.trim();

  return trimmedValue ? redactUrlForDisplay(trimmedValue) : fallback;
}
