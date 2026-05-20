import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-charcoal text-warm-white hover:bg-clay hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(201,126,99,0.3)]",
  ghost: "bg-transparent text-navy hover:text-clay",
  outline:
    "border border-[rgba(46,46,46,0.2)] bg-transparent text-charcoal hover:border-sage hover:bg-paper",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2.5 rounded font-sans text-sm font-medium tracking-[0.02em] transition-all duration-300",
          "px-7 py-3.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-charcoal disabled:hover:shadow-none",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
