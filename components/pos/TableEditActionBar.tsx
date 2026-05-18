"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

type TableEditActionBarProps = {
  disabled: boolean;
  hasDuplicateNumbers: boolean;
  selectedCount: number;
  onDone: () => void;
  onCancel: () => void;
};

const modeLabelKey = {
  add: "addTableMode",
  move: "moveTableMode",
  delete: "deleteTableMode",
  number: "numberEditMode",
  idle: "numberEditMode",
} as const;

export function TableEditActionBar({
  disabled,
  hasDuplicateNumbers,
  selectedCount,
  onDone,
  onCancel,
}: TableEditActionBarProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const mode = useWorkspaceStore((state) => state.tableEditMode);
  const locked = useWorkspaceStore((state) => state.tableEditLocked);

  if (locked || mode === "idle") return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            {t.currentMode}
          </p>
          <p className="text-lg font-black">
            {t[modeLabelKey[mode]]}
            {mode === "delete" ? ` · ${t.selectedTables}: ${selectedCount}` : ""}
          </p>
          {hasDuplicateNumbers ? (
            <p className="mt-1 text-sm font-bold text-club-red">
              {t.duplicateTableNumbers}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button icon={<X size={18} />} onClick={onCancel} variant="secondary">
            {t.cancel}
          </Button>
          <Button disabled={disabled} icon={<Check size={18} />} onClick={onDone}>
            {t.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
