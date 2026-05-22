import { useMemo, useRef } from "react";
import { Copy, Download, EyeOff, FileUp, Plus, Server, Trash2, Variable } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AppEnvironment,
  createEnvironmentExport,
  getActiveEnvironment,
  hasEnvironmentVariables,
  interpolateEnvironmentVariables,
  isValidEnvironmentVariableKey,
  parseEnvironmentExport,
  redactEnvironmentSecrets,
} from "@/models";
import { useEnvironmentStore } from "@/store/environment-store";
import { useUiStore } from "@/store/ui-store";

type ProfilePreview =
  | {
      label: string;
      ok: true;
    }
  | {
      missingVariables: string[];
      ok: false;
    };

export function EnvironmentManager() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeEnvironmentId = useEnvironmentStore((state) => state.activeEnvironmentId);
  const addConnectionProfile = useEnvironmentStore((state) => state.addConnectionProfile);
  const addEnvironment = useEnvironmentStore((state) => state.addEnvironment);
  const addVariable = useEnvironmentStore((state) => state.addVariable);
  const deleteConnectionProfile = useEnvironmentStore((state) => state.deleteConnectionProfile);
  const deleteEnvironment = useEnvironmentStore((state) => state.deleteEnvironment);
  const deleteVariable = useEnvironmentStore((state) => state.deleteVariable);
  const duplicateEnvironment = useEnvironmentStore((state) => state.duplicateEnvironment);
  const environments = useEnvironmentStore((state) => state.environments);
  const replaceEnvironments = useEnvironmentStore((state) => state.replaceEnvironments);
  const setActiveEnvironment = useEnvironmentStore((state) => state.setActiveEnvironment);
  const updateConnectionProfile = useEnvironmentStore((state) => state.updateConnectionProfile);
  const updateEnvironment = useEnvironmentStore((state) => state.updateEnvironment);
  const updateVariable = useEnvironmentStore((state) => state.updateVariable);
  const activeEnvironment = useMemo(
    () => getActiveEnvironment(environments, activeEnvironmentId),
    [activeEnvironmentId, environments],
  );

  if (!activeEnvironment) {
    return null;
  }

  function handleExport() {
    const payload = JSON.stringify(createEnvironmentExport(environments), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "socketlens-environments.json";
    anchor.click();
    URL.revokeObjectURL(url);
    useUiStore.getState().addToast({
      level: "success",
      message: t("environments.toasts.exportedDescription"),
      title: t("environments.toasts.exported"),
    });
  }

  async function handleImport(file: File) {
    try {
      const imported = parseEnvironmentExport(JSON.parse(await file.text()));

      replaceEnvironments(imported);
      useUiStore.getState().addToast({
        level: "success",
        message: t("environments.toasts.importedDescription", { count: imported.length }),
        title: t("environments.toasts.imported"),
      });
    } catch (error) {
      useUiStore.getState().addToast({
        level: "warning",
        message: t("environments.importFailedDescription"),
        title: t("environments.importFailed"),
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="grid gap-1 rounded-md border border-border/70 bg-background/45 p-1 md:grid-cols-3">
        {environments.map((environment) => (
          <button
            key={environment.id}
            type="button"
            aria-pressed={environment.id === activeEnvironment.id}
            className={[
              "sl-button min-w-0 rounded-md px-3 py-1.5 text-left text-xs font-medium transition",
              environment.id === activeEnvironment.id
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveEnvironment(environment.id)}
          >
            <span className="block truncate">{environment.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <label className="sl-caption space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("environments.name")}
          <Input
            value={activeEnvironment.name}
            spellCheck={false}
            onChange={(event) => updateEnvironment(activeEnvironment.id, { name: event.target.value })}
          />
        </label>
        <label className="sl-caption space-y-1.5 text-xs font-medium text-muted-foreground">
          {t("environments.description")}
          <Input
            value={activeEnvironment.description}
            spellCheck={false}
            onChange={(event) => updateEnvironment(activeEnvironment.id, { description: event.target.value })}
          />
        </label>
      </div>

      <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="sl-heading inline-flex items-center gap-2 text-sm font-medium">
            <Variable className="h-4 w-4 text-primary" />
            {t("environments.variables")}
          </p>
          <Button variant="ghost" size="sm" onClick={() => addVariable(activeEnvironment.id)}>
            <Plus className="h-4 w-4" />
            {t("environments.addVariable")}
          </Button>
        </div>

        <div className="space-y-1.5">
          {activeEnvironment.variables.map((variable) => {
            const isValidKey = isValidEnvironmentVariableKey(variable.key);

            return (
              <div key={variable.id} className="grid gap-1.5 rounded-md border border-border/70 bg-muted/15 p-2 md:grid-cols-[0.75fr_1fr_auto_auto]">
                <Input
                  aria-label={t("environments.variableKey")}
                  className={isValidKey ? "" : "border-destructive/50"}
                  value={variable.key}
                  spellCheck={false}
                  onChange={(event) => updateVariable(activeEnvironment.id, variable.id, { key: event.target.value })}
                />
                <Input
                  aria-label={t("environments.variableValue")}
                  type={variable.isSecret ? "password" : "text"}
                  value={variable.value}
                  spellCheck={false}
                  onChange={(event) => updateVariable(activeEnvironment.id, variable.id, { value: event.target.value })}
                />
                <Button
                  variant={variable.isSecret ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateVariable(activeEnvironment.id, variable.id, { isSecret: !variable.isSecret })}
                >
                  <EyeOff className="h-4 w-4" />
                  {variable.isSecret ? t("environments.secret") : t("environments.public")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteVariable(activeEnvironment.id, variable.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="sl-copy mt-2 text-xs text-muted-foreground">{t("environments.variablesHint")}</p>
      </div>

      <div className="rounded-md border border-border/70 bg-background/45 p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="sl-heading inline-flex items-center gap-2 text-sm font-medium">
            <Server className="h-4 w-4 text-primary" />
            {t("environments.connectionProfiles")}
          </p>
          <Button variant="ghost" size="sm" onClick={() => addConnectionProfile(activeEnvironment.id)}>
            <Plus className="h-4 w-4" />
            {t("environments.addProfile")}
          </Button>
        </div>

        <div className="space-y-1.5">
          {activeEnvironment.connectionProfiles.map((profile) => {
            const preview = getProfilePreview(profile.endpointUrl, activeEnvironment);

            return (
              <div key={profile.id} className="rounded-md border border-border/70 bg-muted/15 p-2">
                <div className="grid gap-1.5 md:grid-cols-[0.75fr_1.25fr_auto]">
                  <Input
                    aria-label={t("environments.profileName")}
                    value={profile.name}
                    spellCheck={false}
                    onChange={(event) => updateConnectionProfile(activeEnvironment.id, profile.id, { name: event.target.value })}
                  />
                  <Input
                    aria-label={t("environments.profileUrl")}
                    value={profile.endpointUrl}
                    spellCheck={false}
                    onChange={(event) =>
                      updateConnectionProfile(activeEnvironment.id, profile.id, { endpointUrl: event.target.value })
                    }
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteConnectionProfile(activeEnvironment.id, profile.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className={["mt-1.5 truncate font-mono text-[0.72rem]", preview.ok ? "text-muted-foreground" : "text-amber-100"].join(" ")}>
                  {preview.ok ? preview.label : t("environments.missingVariables", { variables: preview.missingVariables.join(", ") })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={addEnvironment}>
            <Plus className="h-4 w-4" />
            {t("environments.addEnvironment")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => duplicateEnvironment(activeEnvironment.id)}>
            <Copy className="h-4 w-4" />
            {t("environments.duplicate")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={environments.length <= 1}
            onClick={() => deleteEnvironment(activeEnvironment.id)}
          >
            <Trash2 className="h-4 w-4" />
            {t("environments.delete")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];

              if (file) {
                void handleImport(file);
              }
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            {t("environments.import")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t("environments.export")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2">
        <p className="sl-copy text-xs text-amber-50/80">{t("environments.exportIncludesSecrets")}</p>
      </div>
    </div>
  );
}

function getProfilePreview(endpointUrl: string, environment: AppEnvironment): ProfilePreview {
  if (!hasEnvironmentVariables(endpointUrl)) {
    return {
      label: endpointUrl,
      ok: true,
    };
  }

  const result = interpolateEnvironmentVariables(endpointUrl, environment);

  if (!result.ok) {
    return {
      missingVariables: result.missingVariables,
      ok: false,
    };
  }

  return {
    label: redactEnvironmentSecrets(result.value, environment),
    ok: true,
  };
}
