import type { ReactNode } from "react";

type AppShellProps = {
  bottomPanel: ReactNode;
  bottomPanelCollapsed?: boolean;
  children: ReactNode;
  inspector: ReactNode;
  sidebar: ReactNode;
  topBar: ReactNode;
};

export function AppShell({ bottomPanel, bottomPanelCollapsed = false, children, inspector, sidebar, topBar }: AppShellProps) {
  const desktopRows = bottomPanelCollapsed
    ? "lg:grid-rows-[minmax(0,1fr)_2.5rem]"
    : "lg:grid-rows-[minmax(0,1fr)_clamp(9rem,18dvh,12rem)]";

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border/80 bg-shell/95 backdrop-blur lg:static">
        {topBar}
      </header>
      <div
        className={[
          "grid flex-1 grid-cols-1 gap-px bg-border/70 lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(34rem,1fr)_24rem] 2xl:grid-cols-[19rem_minmax(40rem,1fr)_26rem]",
          desktopRows,
        ].join(" ")}
      >
        <aside className="bg-panel lg:row-span-2 lg:min-h-0">{sidebar}</aside>
        <main className="min-h-[28rem] bg-background lg:min-h-0">{children}</main>
        <aside className="min-h-[18rem] bg-panel xl:row-span-2 xl:min-h-0">{inspector}</aside>
        <section
          className={[
            "bg-panel transition-[min-height] duration-200 ease-out",
            bottomPanelCollapsed ? "min-h-10" : "min-h-[9rem]",
          ].join(" ")}
        >
          {bottomPanel}
        </section>
      </div>
    </div>
  );
}
