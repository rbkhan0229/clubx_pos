import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-club-acid text-club-black shadow-sm hover:bg-club-lime focus-visible:ring-club-lime",
  secondary:
    "border border-slate-200 bg-white text-club-ink shadow-sm hover:border-club-acid hover:bg-lime-50 focus-visible:ring-club-ink/20",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-club-ink/20",
  danger:
    "bg-club-red text-white hover:bg-red-500 focus-visible:ring-club-red",
};

export function Button({
  className,
  variant = "primary",
  icon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "touch-target inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
