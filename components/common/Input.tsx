import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-bold text-slate-600" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={cn(
          "touch-target rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-club-ink outline-none transition placeholder:text-slate-400 focus:border-club-green focus:ring-2 focus:ring-club-lime/40",
          className,
        )}
        {...props}
      />
    </label>
  );
}
