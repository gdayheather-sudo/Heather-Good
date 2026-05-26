"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-500 text-white hover:bg-teal-600 disabled:bg-teal-500/40 disabled:cursor-not-allowed shadow-sm",
  secondary:
    "bg-amber-400 text-ink hover:bg-amber-300 disabled:bg-amber-400/40 shadow-sm",
  ghost:
    "bg-transparent text-ink dark:text-teal-50 hover:bg-ink/5 dark:hover:bg-white/5",
  danger: "bg-coral text-white hover:bg-coral-dark",
  outline:
    "bg-transparent border-2 border-ink dark:border-teal-100 text-ink dark:text-teal-50 hover:bg-ink/5 dark:hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3 text-sm rounded-lg gap-2",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-6 text-lg rounded-xl gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", block, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors",
        "focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1",
        variants[variant],
        sizes[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
