import { useEffect, useState } from "react";
import { DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clampPacketRetentionLimit,
  maxPacketRetentionLimit,
  minPacketRetentionLimit,
  packetRetentionLimitStep,
} from "@/models";
import { usePacketStore } from "@/store/packet-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUiStore } from "@/store/ui-store";

type RetentionSettingsPanelProps = {
  packetCount: number;
};

const packetLimitOptions = [10_000, 25_000, 50_000] as const;

export function RetentionSettingsPanel({ packetCount }: RetentionSettingsPanelProps) {
  const { t } = useTranslation();
  const packetRetentionLimit = useSettingsStore((state) => state.settings.packetRetentionLimit);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [draftLimit, setDraftLimit] = useState(String(packetRetentionLimit));
  const isAtLimit = packetCount >= packetRetentionLimit;

  useEffect(() => {
    setDraftLimit(String(packetRetentionLimit));
  }, [packetRetentionLimit]);

  function commitPacketLimit(value: number) {
    const nextLimit = clampPacketRetentionLimit(value);

    updateSettings({ packetRetentionLimit: nextLimit });
    usePacketStore.getState().trimToRetentionLimit();
    setDraftLimit(String(nextLimit));

    useUiStore.getState().addLog({
      level: "info",
      message: t("retention.messages.limitSet", { count: nextLimit.toLocaleString() }),
    });
  }

  return (
    <div className="rounded-md border border-border/80 bg-muted/15 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="sl-section-label inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <DatabaseZap className="h-3.5 w-3.5" />
          {t("retention.title")}
        </p>
        <Badge variant={isAtLimit ? "outline" : "secondary"} className={isAtLimit ? "border-amber-300/40 text-amber-200" : ""}>
          {packetCount.toLocaleString()} / {packetRetentionLimit.toLocaleString()}
        </Badge>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2">
        {packetLimitOptions.map((limit) => (
          <Button
            key={limit}
            variant={packetRetentionLimit === limit ? "secondary" : "ghost"}
            size="sm"
            onClick={() => commitPacketLimit(limit)}
          >
            {formatCompactLimit(limit)}
          </Button>
        ))}
      </div>

      <label className="sl-caption space-y-2 text-xs font-medium text-muted-foreground">
        {t("settings.packetLimit")}
        <Input
          min={minPacketRetentionLimit}
          max={maxPacketRetentionLimit}
          step={packetRetentionLimitStep}
          type="number"
          value={draftLimit}
          onBlur={() => commitPacketLimit(Number(draftLimit))}
          onChange={(event) => setDraftLimit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <p className="sl-caption mt-2 text-[0.72rem] text-muted-foreground">
        {t("retention.description")}
      </p>
    </div>
  );
}

function formatCompactLimit(limit: number) {
  return `${Math.round(limit / 1_000)}k`;
}
