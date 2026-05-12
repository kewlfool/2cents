import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-control)] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-60",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "min-h-[var(--control-height)] px-3.5 py-2",
        sm: "min-h-[var(--control-height-sm)] px-3 py-1.5 text-sm",
      },
      variant: {
        ghost: "text-accent-strong hover:bg-accent-soft/75",
        primary:
          "bg-accent text-white shadow-[var(--shadow-accent)] hover:bg-accent-strong",
        secondary:
          "border border-line bg-panel text-ink hover:border-accent/25 hover:bg-panel-strong/45",
      },
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      type={type}
      {...props}
    />
  );
}
