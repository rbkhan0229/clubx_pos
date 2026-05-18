"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils/cn";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  bodyClassName?: string;
};

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  bodyClassName,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div
        className={cn(
          "glass-panel flex max-h-[calc(100vh-32px)] w-full max-w-md flex-col rounded-2xl p-5",
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">{title}</h2>
          <Button
            aria-label="Close modal"
            className="h-14 min-h-0 w-14 rounded-full border border-slate-200 bg-white p-0 text-club-ink shadow-sm hover:border-club-green hover:bg-lime-50"
            icon={<X size={30} strokeWidth={2.6} />}
            onClick={onClose}
            variant="ghost"
          />
        </div>
        <div className={cn("min-h-0", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
