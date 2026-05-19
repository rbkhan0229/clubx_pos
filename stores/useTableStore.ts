"use client";

import { create } from "zustand";
import { broadcastClubxSync } from "@/lib/localSync";
import type { Table, TableMergeGroup, TableSize, TableStatus } from "@/types";

type NewTableInput = {
  sessionId: string;
  minCapacity: number;
  maxCapacity: number;
  x: number;
  y: number;
};

type TableState = {
  tablesBySession: Record<string, Table[]>;
  mergeGroupsBySession: Record<string, TableMergeGroup[]>;
  moveSnapshotBySession: Record<string, Table[]>;
  selectedTableIds: string[];
  mergeSelectedTableIds: string[];
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
  selectTableForMergeMode: (tableId: string) => void;
  clearMergeSelection: () => void;
  createMergeGroup: (sessionId: string, tableIds: string[]) => TableMergeGroup | undefined;
  splitMergeGroup: (sessionId: string, groupId: string) => void;
  getMergeGroupByTableId: (sessionId: string, tableId: string) => TableMergeGroup | undefined;
  getMergedGroupCapacity: (sessionId: string, groupId: string) => { minCapacity: number; maxCapacity: number };
  canPlaceTable: (
    sessionId: string,
    table: Table,
    options?: { ignoreTableIds?: string[]; ignoreGroupIds?: string[] },
  ) => boolean;
  canMergeTables: (sessionId: string, tableIds: string[]) => boolean;
  canSplitGroup: (sessionId: string, groupId: string) => boolean;
};

const storageKey = (sessionId: string) => `clubx-pos:tables:${sessionId}`;
const mergeGroupKey = (sessionId: string) => `clubx-pos:table-merge-groups:${sessionId}`;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function getSize(minCapacity: number, maxCapacity: number): TableSize {
  return Math.max(minCapacity, maxCapacity) <= 2 ? 1 : 2;
}

function getNextNumber(tables: Table[]) {
  const used = new Set(tables.map((table) => Number(table.number)));
  let next = 1;
  while (used.has(next)) next += 1;
  return String(next);
}

function saveTables(sessionId: string, tables: Table[], groups?: TableMergeGroup[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(sessionId), JSON.stringify(tables));
  if (groups) window.localStorage.setItem(mergeGroupKey(sessionId), JSON.stringify(groups));
  broadcastClubxSync({ sessionId, store: "tables" });
}

type Point = { x: number; y: number };
type Box = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

function getTableVisualSize(table: Table) {
  return table.size === 1 ? 88 : 116;
}

export function getTableBounds(table: Table): Box {
  const size = getTableVisualSize(table);
  return {
    id: table.id,
    left: table.x - size / 2,
    right: table.x + size / 2,
    top: table.y - size / 2,
    bottom: table.y + size / 2,
    centerX: table.x,
    centerY: table.y,
  };
}

export function doRectsOverlap(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function getGroupBounds(tables: Table[], group: TableMergeGroup): Box | null {
  const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
  if (groupTables.length === 0) return null;
  const boxes = groupTables.map(getTableBounds);
  const left = Math.min(...boxes.map((box) => box.left)) - 10;
  const right = Math.max(...boxes.map((box) => box.right)) + 10;
  const top = Math.min(...boxes.map((box) => box.top)) - 10;
  const bottom = Math.max(...boxes.map((box) => box.bottom)) + 10;
  return {
    id: group.id,
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function candidateSegments(a: Box, b: Box): Array<[Point, Point]> {
  const aNearestX = a.centerX < b.centerX ? a.right : a.left;
  const bNearestX = a.centerX < b.centerX ? b.left : b.right;
  const aNearestY = a.centerY < b.centerY ? a.bottom : a.top;
  const bNearestY = a.centerY < b.centerY ? b.top : b.bottom;

  return [
    [{ x: a.centerX, y: a.centerY }, { x: b.centerX, y: b.centerY }],
    [{ x: aNearestX, y: aNearestY }, { x: bNearestX, y: bNearestY }],
    [{ x: a.centerX, y: a.top }, { x: b.centerX, y: b.top }],
    [{ x: a.centerX, y: a.bottom }, { x: b.centerX, y: b.bottom }],
    [{ x: a.left, y: a.centerY }, { x: b.left, y: b.centerY }],
    [{ x: a.right, y: a.centerY }, { x: b.right, y: b.centerY }],
  ];
}

function segmentIntersectsBox(start: Point, end: Point, box: Box) {
  if (pointInsideBox(start, box) || pointInsideBox(end, box)) return true;
  const corners = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
  return corners.some((corner, index) =>
    segmentsIntersect(start, end, corner, corners[(index + 1) % corners.length]),
  );
}

function pointInsideBox(point: Point, box: Box) {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const ccw = (p1: Point, p2: Point, p3: Point) =>
    (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function areAdjacent(a: Table, b: Table, selectedIds: Set<string>, allTables: Table[]) {
  const aBox = getTableBounds(a);
  const bBox = getTableBounds(b);
  const blockers = allTables
    .filter((table) => table.id !== a.id && table.id !== b.id && !selectedIds.has(table.id))
    .map(getTableBounds);

  return candidateSegments(aBox, bBox).some(([start, end]) =>
    blockers.every((box) => !segmentIntersectsBox(start, end, box)),
  );
}

export const useTableStore = create<TableState>((set, get) => ({
  tablesBySession: {},
  mergeGroupsBySession: {},
  moveSnapshotBySession: {},
  selectedTableIds: [],
  mergeSelectedTableIds: [],
  loadTables: (sessionId) => {
    if (typeof window === "undefined") return;

    const tables = readJson<Table[]>(storageKey(sessionId), []);
    const groups = readJson<TableMergeGroup[]>(mergeGroupKey(sessionId), []);
    set((state) => ({
      tablesBySession: {
        ...state.tablesBySession,
        [sessionId]: tables,
      },
      mergeGroupsBySession: {
        ...state.mergeGroupsBySession,
        [sessionId]: groups,
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
    if (!get().canPlaceTable(sessionId, table)) return;
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
  moveTable: (tableId, x, y) => {
    const state = get();
    const sessionId = Object.keys(state.tablesBySession).find((id) =>
      state.tablesBySession[id].some((table) => table.id === tableId),
    );
    if (!sessionId) return;
    const table = state.tablesBySession[sessionId].find((item) => item.id === tableId);
    if (!table) return;
    const nextTable = { ...table, x, y };
    if (!get().canPlaceTable(sessionId, nextTable, { ignoreTableIds: [tableId] })) return;
    get().updateTable(tableId, { x, y });
  },
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
  selectTableForMergeMode: (tableId) =>
    set((state) => ({
      mergeSelectedTableIds: state.mergeSelectedTableIds.includes(tableId)
        ? state.mergeSelectedTableIds.filter((id) => id !== tableId)
        : [...state.mergeSelectedTableIds, tableId],
    })),
  clearMergeSelection: () => set({ mergeSelectedTableIds: [] }),
  createMergeGroup: (sessionId, tableIds) => {
    if (!get().canMergeTables(sessionId, tableIds)) return undefined;
    const tables = get().tablesBySession[sessionId] ?? [];
    const selected = tables.filter((table) => tableIds.includes(table.id));
    const groupId = `merge-${sessionId}-${Date.now()}`;
    const group: TableMergeGroup = {
      id: groupId,
      sessionId,
      tableIds,
      label: selected
        .slice()
        .sort((a, b) => Number(a.number) - Number(b.number))
        .map((table) => table.number)
        .join("+"),
      originalPositions: selected.reduce<Record<string, { x: number; y: number }>>((next, table) => {
        next[table.id] = { x: table.x, y: table.y };
        return next;
      }, {}),
      createdAt: new Date().toISOString(),
    };
    const nextTables = tables.map((table) =>
      tableIds.includes(table.id)
        ? { ...table, mergedGroupId: groupId, originalPosition: { x: table.x, y: table.y } }
        : table,
    );
    const nextGroups = [...(get().mergeGroupsBySession[sessionId] ?? []), group];
    saveTables(sessionId, nextTables, nextGroups);
    set((state) => ({
      tablesBySession: { ...state.tablesBySession, [sessionId]: nextTables },
      mergeGroupsBySession: { ...state.mergeGroupsBySession, [sessionId]: nextGroups },
      mergeSelectedTableIds: [],
    }));
    return group;
  },
  splitMergeGroup: (sessionId, groupId) => {
    if (!get().canSplitGroup(sessionId, groupId)) return;
    const groups = get().mergeGroupsBySession[sessionId] ?? [];
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    const nextTables = (get().tablesBySession[sessionId] ?? []).map((table) => {
      if (!group.tableIds.includes(table.id)) return table;
      const original = group.originalPositions[table.id] ?? table.originalPosition;
      return {
        ...table,
        x: original?.x ?? table.x,
        y: original?.y ?? table.y,
        mergedGroupId: undefined,
      };
    });
    const nextGroups = groups.filter((item) => item.id !== groupId);
    saveTables(sessionId, nextTables, nextGroups);
    set((state) => ({
      tablesBySession: { ...state.tablesBySession, [sessionId]: nextTables },
      mergeGroupsBySession: { ...state.mergeGroupsBySession, [sessionId]: nextGroups },
      mergeSelectedTableIds: [],
    }));
  },
  getMergeGroupByTableId: (sessionId, tableId) =>
    (get().mergeGroupsBySession[sessionId] ?? []).find((group) => group.tableIds.includes(tableId)),
  getMergedGroupCapacity: (sessionId, groupId) => {
    const group = (get().mergeGroupsBySession[sessionId] ?? []).find((item) => item.id === groupId);
    const tables = get().tablesBySession[sessionId] ?? [];
    const groupTables = group ? tables.filter((table) => group.tableIds.includes(table.id)) : [];
    return {
      minCapacity: groupTables.reduce((sum, table) => sum + table.minCapacity, 0),
      maxCapacity: groupTables.reduce((sum, table) => sum + table.maxCapacity, 0),
    };
  },
  canPlaceTable: (sessionId, table, options) => {
    const ignoreTableIds = new Set(options?.ignoreTableIds ?? [table.id]);
    const ignoreGroupIds = new Set(options?.ignoreGroupIds ?? []);
    if (table.mergedGroupId) ignoreGroupIds.add(table.mergedGroupId);
    const tables = get().tablesBySession[sessionId] ?? [];
    const groups = get().mergeGroupsBySession[sessionId] ?? [];
    const target = getTableBounds(table);
    const overlapsTable = tables.some(
      (item) => !ignoreTableIds.has(item.id) && doRectsOverlap(target, getTableBounds(item)),
    );
    if (overlapsTable) return false;
    return groups.every((group) => {
      if (ignoreGroupIds.has(group.id)) return true;
      const bounds = getGroupBounds(tables, group);
      return !bounds || !doRectsOverlap(target, bounds);
    });
  },
  canMergeTables: (sessionId, tableIds) => {
    if (tableIds.length < 2) return false;
    const tables = get().tablesBySession[sessionId] ?? [];
    const selected = tables.filter((table) => tableIds.includes(table.id));
    if (selected.length !== tableIds.length) return false;
    if (selected.some((table) => table.status === "cleaning" || table.mergedGroupId)) return false;
    const connected = new Set<string>([selected[0].id]);
    let changed = true;
    while (changed) {
      changed = false;
      selected.forEach((table) => {
        if (connected.has(table.id)) return;
        if (
          selected.some((other) =>
            connected.has(other.id) && areAdjacent(table, other, new Set(tableIds), tables),
          )
        ) {
          connected.add(table.id);
          changed = true;
        }
      });
    }
    if (connected.size !== selected.length) return false;
    const groups = get().mergeGroupsBySession[sessionId] ?? [];
    const groupBounds = getGroupBounds(tables, {
      id: "candidate",
      sessionId,
      tableIds,
      label: "",
      originalPositions: {},
      createdAt: "",
    });
    if (!groupBounds) return false;
    const selectedIds = new Set(tableIds);
    const overlapsUnrelatedTable = tables.some(
      (table) => !selectedIds.has(table.id) && doRectsOverlap(groupBounds, getTableBounds(table)),
    );
    if (overlapsUnrelatedTable) return false;
    return groups.every((group) => {
      const bounds = getGroupBounds(tables, group);
      return !bounds || !doRectsOverlap(groupBounds, bounds);
    });
  },
  canSplitGroup: (sessionId, groupId) => {
    const group = (get().mergeGroupsBySession[sessionId] ?? []).find((item) => item.id === groupId);
    if (!group) return false;
    const tables = get().tablesBySession[sessionId] ?? [];
    return tables
      .filter((table) => group.tableIds.includes(table.id))
      .every((table) => table.status === "empty" || table.status === "cleaning" || table.status === "occupied");
  },
}));

export function tableStatusLabel(status: TableStatus) {
  if (status === "empty") return "Empty";
  if (status === "occupied") return "Occupied";
  return "Cleaning";
}
