import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Command, CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type CommandPaletteCommand = {
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  group: string;
  icon: LucideIcon;
  id: string;
  keywords?: string[];
  run: () => void;
  title: string;
};

type CommandPaletteProps = {
  commands: CommandPaletteCommand[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function CommandPalette({ commands, isOpen, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    const tokens = normalizeQuery(query).split(" ").filter(Boolean);

    if (tokens.length === 0) {
      return commands;
    }

    return commands.filter((command) => {
      const haystack = normalizeQuery(
        [command.title, command.description, command.group, command.disabledReason, ...(command.keywords ?? [])].join(" "),
      );

      return tokens.every((token) => haystack.includes(token));
    });
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Array<{ commands: Array<CommandPaletteCommand & { filteredIndex: number }>; name: string }> = [];

    filteredCommands.forEach((command, filteredIndex) => {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.name === command.group) {
        lastGroup.commands.push({ ...command, filteredIndex });
        return;
      }

      groups.push({
        commands: [{ ...command, filteredIndex }],
        name: command.group,
      });
    });

    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const isClassicPaletteShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p";

      if (!isCommandShortcut && !isClassicPaletteShortcut) {
        return;
      }

      event.preventDefault();
      onOpenChange(true);
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (filteredCommands.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((currentIndex) => Math.min(currentIndex, filteredCommands.length - 1));
  }, [filteredCommands.length]);

  if (!isOpen) {
    return null;
  }

  function runCommand(command: CommandPaletteCommand) {
    if (command.disabled) {
      return;
    }

    command.run();
    onOpenChange(false);
  }

  function moveActiveIndex(direction: 1 | -1) {
    if (filteredCommands.length === 0) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return filteredCommands.length - 1;
      }

      if (nextIndex >= filteredCommands.length) {
        return 0;
      }

      return nextIndex;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-background/70 px-4 pt-[12dvh] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={t("commandPalette.title")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl shadow-black/45">
        <div className="flex items-center gap-3 border-b border-border/75 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-primary" />
          <input
            ref={inputRef}
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            placeholder={t("commandPalette.placeholder")}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onOpenChange(false);
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveActiveIndex(1);
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveActiveIndex(-1);
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const activeCommand = filteredCommands[activeIndex];

                if (activeCommand) {
                  runCommand(activeCommand);
                }
              }
            }}
          />
          <kbd className="hidden rounded-md border border-border bg-muted/40 px-2 py-1 text-[0.68rem] font-medium text-muted-foreground sm:block">
            {t("commandPalette.shortcut")}
          </kbd>
        </div>

        <div className="max-h-[min(28rem,62dvh)] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed border-border/80 px-4 text-center">
              <Command className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="sl-heading text-sm font-semibold">{t("commandPalette.empty.title")}</p>
              <p className="sl-copy mt-1 max-w-sm text-xs text-muted-foreground">{t("commandPalette.empty.description")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupedCommands.map((group) => (
                <div key={group.name} className="space-y-1">
                  <p className="sl-section-label px-2 py-1 text-[0.68rem] font-semibold uppercase text-muted-foreground">
                    {group.name}
                  </p>
                  {group.commands.map((command) => (
                    <CommandRow
                      key={command.id}
                      active={command.filteredIndex === activeIndex}
                      command={command}
                      onMouseEnter={() => setActiveIndex(command.filteredIndex)}
                      onRun={() => runCommand(command)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/75 bg-background/30 px-3 py-2 text-[0.72rem] text-muted-foreground">
          <span>{t("commandPalette.footer.navigate")}</span>
          <span className="inline-flex items-center gap-1.5">
            <CornerDownLeft className="h-3.5 w-3.5" />
            {t("commandPalette.footer.run")}
          </span>
        </div>
      </div>
    </div>
  );
}

type CommandRowProps = {
  active: boolean;
  command: CommandPaletteCommand;
  onMouseEnter: () => void;
  onRun: () => void;
};

function CommandRow({ active, command, onMouseEnter, onRun }: CommandRowProps) {
  const { t } = useTranslation();
  const Icon = command.icon;

  return (
    <button
      type="button"
      aria-disabled={command.disabled ? true : undefined}
      className={[
        "flex w-full items-start gap-3 rounded-md border px-2.5 py-2 text-left transition",
        active ? "border-primary/45 bg-primary/10" : "border-transparent hover:border-border/70 hover:bg-muted/25",
        command.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
      onClick={onRun}
      onMouseEnter={onMouseEnter}
    >
      <span
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          command.disabled ? "border-border/70 bg-muted/20 text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="sl-heading flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="truncate">{command.title}</span>
          {!command.disabled && active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
        </span>
        <span className="sl-copy mt-0.5 block text-xs text-muted-foreground">{command.description}</span>
        {command.disabled && command.disabledReason ? (
          <span className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[0.72rem] text-amber-100">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{t("commandPalette.unavailable", { reason: command.disabledReason })}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function normalizeQuery(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
