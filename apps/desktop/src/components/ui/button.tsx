import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "sl-button inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-primary/40 bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.12)] hover:bg-primary/90",
        destructive: "border border-destructive/40 bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border/80 bg-background hover:bg-muted",
        secondary: "border border-border/80 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-7 rounded-md px-2.5",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp ref={ref} className={cn(buttonVariants({ className, size, variant }))} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
