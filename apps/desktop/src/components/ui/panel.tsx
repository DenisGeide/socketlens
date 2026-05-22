import * as React from "react";
import { cn } from "@/lib/utils";

const PanelHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-h-10 items-center justify-between gap-2 border-b border-border/70 px-3", className)}
      {...props}
    />
  ),
);
PanelHeader.displayName = "PanelHeader";

const PanelTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("sl-section-label text-[0.72rem] font-semibold uppercase leading-4 text-muted-foreground", className)} {...props} />
  ),
);
PanelTitle.displayName = "PanelTitle";

const PanelContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-3", className)} {...props} />,
);
PanelContent.displayName = "PanelContent";

export { PanelContent, PanelHeader, PanelTitle };
