import type { Order, PartyCard, Table, TableMergeGroup, Visit } from "@/types";

export const LOCAL_STORAGE_SCHEMA_VERSION = 11;
const versionKey = "clubx-pos:schema-version";

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

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureLocalStorageSchema() {
  if (typeof window === "undefined") return;
  const rawVersion = Number(window.localStorage.getItem(versionKey) ?? "0");
  if (!Number.isFinite(rawVersion) || rawVersion < LOCAL_STORAGE_SCHEMA_VERSION) {
    window.localStorage.setItem(versionKey, String(LOCAL_STORAGE_SCHEMA_VERSION));
  }
}

export function resetClubxLocalData() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("clubx-pos:"))
    .forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(versionKey, String(LOCAL_STORAGE_SCHEMA_VERSION));
}

export function sanitizeSessionLocalData(sessionId: string) {
  if (typeof window === "undefined") return;
  ensureLocalStorageSchema();

  const tableKey = `clubx-pos:tables:${sessionId}`;
  const mergeKey = `clubx-pos:table-merge-groups:${sessionId}`;
  const partyKey = `clubx-pos:party-cards:${sessionId}`;
  const visitKey = `clubx-pos:visits:${sessionId}`;
  const orderKey = `clubx-pos:orders:${sessionId}`;
  const qrKey = `clubx-pos:qr-orders:${sessionId}`;

  const tables = readJson<Table[]>(tableKey, []);
  const tableStatusById = new Map(tables.map((table) => [table.id, table.status]));
  const tableIds = new Set(tables.map((table) => table.id));
  const rawGroups = readJson<TableMergeGroup[]>(mergeKey, []);
  const groups: TableMergeGroup[] = [];
  const groupedTableIds = new Set<string>();

  rawGroups.forEach((group) => {
    const tableIdsInGroup = group.tableIds.filter((tableId) => tableIds.has(tableId));
    if (tableIdsInGroup.length < 2) return;
    if (tableIdsInGroup.some((tableId) => groupedTableIds.has(tableId))) return;
    tableIdsInGroup.forEach((tableId) => groupedTableIds.add(tableId));
    groups.push({ ...group, tableIds: tableIdsInGroup });
  });

  const groupIds = new Set(groups.map((group) => group.id));
  const nextTables = tables.map((table) =>
    table.mergedGroupId && !groupIds.has(table.mergedGroupId)
      ? { ...table, mergedGroupId: undefined }
      : table,
  );

  const partyCards = readJson<PartyCard[]>(partyKey, []);
  const partyCardIds = new Set(partyCards.map((card) => card.id));
  const nextPartyCards = partyCards.map((card) => ({
    ...card,
    mappedTableIds: (card.mappedTableIds ?? []).filter((tableId) => tableIds.has(tableId)),
  }));

  const visits = readJson<Visit[]>(visitKey, []);
  const nextVisits = visits
    .map((visit) => ({
      ...visit,
      tableIds: visit.tableIds.filter((tableId) => tableIds.has(tableId)),
      partyCardIds: visit.partyCardIds.filter((partyCardId) => partyCardIds.has(partyCardId)),
    }))
    .filter((visit) => {
      if (visit.status !== "active") return true;
      if (visit.tableIds.length === 0 || visit.partyCardIds.length === 0) return false;
      return visit.tableIds.some((tableId) => tableStatusById.get(tableId) === "occupied");
    });

  const visitIds = new Set(nextVisits.map((visit) => visit.id));
  const orders = readJson<Order[]>(orderKey, []);
  const nextOrders = orders.filter((order) => visitIds.has(order.visitId));
  const qrKeys = Array.from(new Set(readJson<string[]>(qrKey, []).filter(Boolean)));

  writeJson(tableKey, nextTables);
  writeJson(mergeKey, groups);
  writeJson(partyKey, nextPartyCards);
  writeJson(visitKey, nextVisits);
  writeJson(orderKey, nextOrders);
  writeJson(qrKey, qrKeys);
}
