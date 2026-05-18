"use client";

import { GitMerge, Scissors, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useTableStore } from "@/stores/useTableStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Table } from "@/types";

type TableMergeActionBarProps = {
  sessionId: string;
  onCancel: () => void;
  onMerge: () => void;
  onSplit: () => void;
};

export function TableMergeActionBar({
  sessionId,
  onCancel,
  onMerge,
  onSplit,
}: TableMergeActionBarProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const tableMergeMode = useWorkspaceStore((state) => state.tableMergeMode);
  const selectedIds = useTableStore((state) => state.mergeSelectedTableIds);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const canMergeTables = useTableStore((state) => state.canMergeTables);
  const canSplitGroup = useTableStore((state) => state.canSplitGroup);
  const selectedTables = tables.filter((table) => selectedIds.includes(table.id));
  const selectedGroupId = selectedTables[0]?.mergedGroupId;
  const selectedGroupConsistent =
    selectedGroupId && selectedTables.every((table) => table.mergedGroupId === selectedGroupId);
  const canMerge =
    selectedIds.length >= 2 &&
    selectedTables.every((table) => !table.mergedGroupId) &&
    canMergeTables(sessionId, selectedIds);
  const canSplit =
    selectedIds.length >= 1 &&
    Boolean(selectedGroupConsistent) &&
    canSplitGroup(sessionId, selectedGroupId ?? "");

  if (!tableMergeMode) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(820px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            {t.mergeSplitMode}
          </p>
          <p className="text-lg font-black">
            {t.selectedTables}: {selectedIds.length}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button disabled={!canMerge} icon={<GitMerge size={18} />} onClick={onMerge}>
            {t.merge}
          </Button>
          <Button disabled={!canSplit} icon={<Scissors size={18} />} onClick={onSplit}>
            {t.split}
          </Button>
          <Button icon={<X size={18} />} onClick={onCancel} variant="secondary">
            {t.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_TABLES: Table[] = [];
