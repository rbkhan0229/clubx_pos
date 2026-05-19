import { broadcastClubxSync } from "@/lib/localSync";

export function readLocalJson<T>(key: string, fallback: T): T {
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

export function writeLocalJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalItem(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function broadcastLocalRepositorySync(
  store: Parameters<typeof broadcastClubxSync>[0]["store"],
  sessionId?: string,
) {
  broadcastClubxSync({ store, sessionId });
}

export const localKeys = {
  sessions: "clubx-pos:sessions",
  tables: (sessionId: string) => `clubx-pos:tables:${sessionId}`,
  mergeGroups: (sessionId: string) => `clubx-pos:table-merge-groups:${sessionId}`,
  menuCategories: (sessionId: string) => `clubx-pos:menu-categories:${sessionId}`,
  menuItems: (sessionId: string) => `clubx-pos:menu-items:${sessionId}`,
  menuLocked: (sessionId: string) => `clubx-pos:menu-locked:${sessionId}`,
  partyCards: (sessionId: string) => `clubx-pos:party-cards:${sessionId}`,
  visits: (sessionId: string) => `clubx-pos:visits:${sessionId}`,
  orders: (sessionId: string) => `clubx-pos:orders:${sessionId}`,
  payments: (sessionId: string) => `clubx-pos:payments:${sessionId}`,
  devices: "clubx-pos:handy-devices",
  qrOrders: (sessionId: string) => `clubx-pos:qr-orders:${sessionId}`,
  timeLogs: "clubx-pos:time-logs",
  timeLogsByVisit: (sessionId: string) => `clubx-pos:time-logs:${sessionId}`,
};
