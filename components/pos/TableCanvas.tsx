"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/stores/useAppStore";
import { tableStatusLabel, useTableStore } from "@/stores/useTableStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Table } from "@/types";
import type { TableModalState } from "@/components/pos/PosWorkspace";

type TableCanvasProps = {
  sessionId: string;
  hasDuplicateNumbers: boolean;
  onOpenModal: (modal: TableModalState) => void;
  onAssignSelectedPartyCard?: (table: Table) => boolean;
};

const tableSizeClass = {
  1: "h-20 w-24",
  2: "h-24 w-32",
  3: "h-28 w-40",
};

const EMPTY_TABLES: Table[] = [];

const statusClass = {
  empty: "border-club-green bg-club-acid text-club-black",
  occupied: "border-club-black bg-club-black text-white",
  cleaning: "border-slate-400 bg-slate-300 text-club-ink",
};

export function TableCanvas({
  sessionId,
  hasDuplicateNumbers,
  onOpenModal,
  onAssignSelectedPartyCard,
}: TableCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const updateTable = useTableStore((state) => state.updateTable);
  const moveTable = useTableStore((state) => state.moveTable);
  const selectTable = useTableStore((state) => state.selectTable);
  const selectedTableIds = useTableStore((state) => state.selectedTableIds);
  const tableEditMode = useWorkspaceStore((state) => state.tableEditMode);
  const tableEditLocked = useWorkspaceStore((state) => state.tableEditLocked);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const duplicateNumbers = useMemo(() => {
    const counts = new Map<string, number>();
    tables.forEach((table) => {
      const number = table.number.trim();
      counts.set(number, (counts.get(number) ?? 0) + 1);
    });
    return new Set(
      [...counts.entries()]
        .filter(([number, count]) => number && count > 1)
        .map(([number]) => number),
    );
  }, [tables]);

  function getCanvasPoint(event: PointerEvent<HTMLElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: Math.max(16, Math.round(event.clientX - rect.left)),
      y: Math.max(16, Math.round(event.clientY - rect.top)),
    };
  }

  function handleCanvasClick(event: PointerEvent<HTMLDivElement>) {
    if (tableEditLocked || tableEditMode !== "add") return;
    if (event.target !== event.currentTarget) return;

    const point = getCanvasPoint(event);
    onOpenModal({ type: "capacity", ...point });
  }

  function handleTableClick(table: Table) {
    if (tableEditMode === "delete" && !tableEditLocked) {
      selectTable(table.id);
      return;
    }

    if (tableEditMode === "move" || tableEditMode === "add") return;

    if (table.status === "empty") {
      if (onAssignSelectedPartyCard?.(table)) return;
      onOpenModal({ type: "walkInConfirm", table });
      return;
    }

    if (table.status === "cleaning") {
      onOpenModal({ type: "cleaningConfirm", table });
      return;
    }

    onOpenModal({ type: "order", table });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, table: Table) {
    if (tableEditLocked || tableEditMode !== "move") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(table.id);
  }

  function dragTable(event: PointerEvent<HTMLDivElement>, table: Table) {
    if (draggingId !== table.id || tableEditMode !== "move") return;
    const point = getCanvasPoint(event);
    moveTable(table.id, point.x, point.y);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (draggingId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
  }

  return (
    <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#f7f8f2] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            Counter POS
          </p>
          <h1 className="text-xl font-black">Session: {sessionId}</h1>
        </div>
        {hasDuplicateNumbers ? (
          <p className="max-w-md rounded-xl bg-club-red/10 px-3 py-2 text-sm font-bold text-club-red">
            {t.duplicateTableNumbers}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "relative h-[calc(100vh-170px)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
          (tableEditMode === "add" || tableEditMode === "move") &&
            !tableEditLocked &&
            "bg-[linear-gradient(rgba(24,162,0,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(24,162,0,0.10)_1px,transparent_1px)] bg-[size:32px_32px]",
        )}
        onPointerDown={handleCanvasClick}
        ref={canvasRef}
      >
        {tables.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black text-slate-300">ClubX Table Canvas</p>
              <p className="mt-2 text-sm font-bold text-slate-400">
                Unlock edit mode and add tables.
              </p>
            </div>
          </div>
        ) : null}

        {tables.map((table) => {
          const selected = selectedTableIds.includes(table.id);
          const duplicate = duplicateNumbers.has(table.number.trim());

          return (
            <div
              className={cn(
                "absolute grid cursor-pointer select-none place-items-center rounded-2xl border-2 p-3 text-center shadow-md transition",
                tableSizeClass[table.size],
                statusClass[table.status],
                selected && "ring-4 ring-club-red ring-offset-2",
                duplicate && "ring-4 ring-club-red/70",
                tableEditMode === "move" && !tableEditLocked && "cursor-grab active:cursor-grabbing",
              )}
              key={table.id}
              onClick={() => handleTableClick(table)}
              onPointerDown={(event) => startDrag(event, table)}
              onPointerMove={(event) => dragTable(event, table)}
              onPointerUp={endDrag}
              style={{
                left: table.x,
                top: table.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {!tableEditLocked && tableEditMode === "number" ? (
                <input
                  aria-label={`Table ${table.number} number`}
                  className="mb-2 w-16 rounded-xl border border-black/15 bg-white/90 px-2 py-1 text-center text-xl font-black text-club-ink outline-none"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateTable(table.id, { number: event.target.value })}
                  value={table.number}
                />
              ) : (
                <strong className="text-2xl font-black">{table.number}</strong>
              )}
              <span className="text-xs font-black uppercase tracking-[0.12em] opacity-80">
                {tableStatusLabel(table.status)}
              </span>
              <span className="text-xs font-bold opacity-80">
                {table.minCapacity}-{table.maxCapacity}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
