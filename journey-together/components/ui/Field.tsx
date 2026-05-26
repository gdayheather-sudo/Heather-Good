"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border-2 border-ink/10 dark:border-white/10 bg-white dark:bg-ink-soft px-4 py-3 text-base font-medium text-ink dark:text-teal-50 placeholder:text-ink/40 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

export function Label({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="block text-sm font-bold text-ink dark:text-teal-50">
        {children}
        {required && <span className="text-coral ml-1" aria-hidden>*</span>}
      </span>
      {hint && (
        <span className="block text-xs text-ink/60 dark:text-teal-100/60 mt-0.5">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, "min-h-[96px]", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, "pr-8", props.className)} />;
}

export function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function Checkbox({
  label,
  hint,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-ink/10 dark:border-white/10 p-3 hover:bg-ink/5 dark:hover:bg-white/5 transition-colors"
    >
      <input
        type="checkbox"
        id={id}
        {...rest}
        className="mt-1 h-6 w-6 accent-teal-500 cursor-pointer"
      />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && (
          <span className="block text-sm text-ink/60 dark:text-teal-100/60 mt-0.5">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function Radio({
  label,
  hint,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer rounded-xl border-2 border-ink/10 dark:border-white/10 p-3 hover:bg-ink/5 dark:hover:bg-white/5 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:has-[:checked]:bg-teal-800/40">
      <input
        type="radio"
        {...rest}
        className="mt-1 h-6 w-6 accent-teal-500 cursor-pointer"
      />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && (
          <span className="block text-sm text-ink/60 dark:text-teal-100/60 mt-0.5">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
