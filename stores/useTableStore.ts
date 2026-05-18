"use client";

import { create } from "zustand";
import { broadcastClubxSync } from "@/lib/localSync";
import type { Table, TableSize, TableStatus } from "@/types";

type NewTableInput = {
  sessionId: string;
  minCapacity: number;
  maxCapacity: number;
  x: number;
  y: number;
};

type TableState = {
  tablesBySession: Record<string, Table[]>;
  moveSnapshotBySession: Record<string, Table[]>;
  selectedTableIds: string[];
  loadTables: (sessionId: string) => void;
  addTable: (input: NewTableInput) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  captureMoveSnapshot: (sessionId: string) => void;
  restoreMoveSnapshot: (sessionId: string) => void;
  clearMoveSnapshot: (sessionId: string) => void;
  deleteTables: (tableIds: string[]) => void;
  selectTable: (tableId: string) => void;
  clearSelection: () => void;
};

const storageKey = (sessionId: string) => `clubx-pos:tables:${sessionId}`;

function getSize(minCapacity: number, maxCapacity: number): TableSize {
  const capacity = Math.max(minCapacity, maxCapacity);
  if (capacity <= 2) return 1;
  if (capacity <= 5) return 2;
  return 3;
}

function getNextNumber(tables: Table[]) {
  const used = new Set(tables.map((table) => Number(table.number)));
  let next = 1;
  while (used.has(next)) next += 1;
  return String(next);
}

function saveTables(sessionId: string, tables: Table[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(sessionId), JSON.stringify(tables));
  broadcastClubxSync({ sessionId, store: "tables" });
}

export const useTableStore = create<TableState>((set, get) => ({
  tablesBySession: {},
  moveSnapshotBySession: {},
  selectedTableIds: [],
  loadTables: (sessionId) => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey(sessionId));
    const tables = raw ? (JSON.parse(raw) as Table[]) : [];
    set((state) => ({
      tablesBySession: {
        ...state.tablesBySession,
        [sessionId]: tables,
      },
    }));
  },
  addTable: ({ sessionId, minCapacity, maxCapacity, x, y }) => {
    const current = get().tablesBySession[sessionId] ?? [];
    const table: Table = {
      id: `table-${sessionId}-${Date.now()}`,
      sessionId,
      number: getNextNumber(current),
      status: "empty",
      size: getSize(minCapacity, maxCapacity),
      minCapacity,
      maxCapacity,
      x,
      y,
      originalPosition: { x, y },
    };
    const next = [...current, table];

    saveTables(sessionId, next);
    set((state) => ({
      tablesBySession: {
        ...state.tablesBySession,
        [sessionId]: next,
      },
    }));
  },
  updateTable: (tableId, updates) => {
    const state = get();
    const sessionId = Object.keys(state.tablesBySession).find((id) =>
      state.tablesBySession[id].some((table) => table.id === tableId),
    );
    if (!sessionId) return;

    const next = state.tablesBySession[sessionId].map((table) =>
      table.id === tableId ? { ...table, ...updates } : table,
    );

    saveTables(sessionId, next);
    set((current) => ({
      tablesBySession: {
        ...current.tablesBySession,
        [sessionId]: next,
      },
    }));
  },
  moveTable: (tableId, x, y) => get().updateTable(tableId, { x, y }),
  captureMoveSnapshot: (sessionId) =>
    set((state) => ({
      moveSnapshotBySession: {
        ...state.moveSnapshotBySession,
        [sessionId]: [...(state.tablesBySession[sessionId] ?? [])],
      },
    })),
  restoreMoveSnapshot: (sessionId) => {
    const snapshot = get().moveSnapshotBySession[sessionId];
    if (!snapshot) return;

    saveTables(sessionId, snapshot);
    set((state) => ({
      tablesBySession: {
        ...state.tablesBySession,
        [sessionId]: snapshot,
      },
      moveSnapshotBySession: {
        ...state.moveSnapshotBySession,
        [sessionId]: [],
      },
    }));
  },
  clearMoveSnapshot: (sessionId) =>
    set((state) => ({
      moveSnapshotBySession: {
        ...state.moveSnapshotBySession,
        [sessionId]: [],
      },
    })),
  deleteTables: (tableIds) => {
    const state = get();
    const ids = new Set(tableIds);
    const nextBySession = { ...state.tablesBySession };

    Object.keys(nextBySession).forEach((sessionId) => {
      const next = nextBySession[sessionId].filter((table) => !ids.has(table.id));
      nextBySession[sessionId] = next;
      saveTables(sessionId, next);
    });

    set({
      tablesBySession: nextBySession,
      selectedTableIds: state.selectedTableIds.filter((id) => !ids.has(id)),
    });
  },
  selectTable: (tableId) =>
    set((state) => ({
      selectedTableIds: state.selectedTableIds.includes(tableId)
        ? state.selectedTableIds.filter((id) => id !== tableId)
        : [...state.selectedTableIds, tableId],
    })),
  clearSelection: () => set({ selectedTableIds: [] }),
}));

export function tableStatusLabel(status: TableStatus) {
  if (status === "empty") return "Empty";
  if (status === "occupied") return "Occupied";
  return "Cleaning";
}
