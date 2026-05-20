"use client";

import { create } from "zustand";
import { mockBusinessSessions } from "@/lib/mock/sessions";
import type {
  BusinessSession,
  Language,
  SortDirection,
  SortKey,
} from "@/types";

type AppState = {
  language: Language;
  mockLogin: {
    mode: "counter" | "handy" | null;
    connectedName?: string;
  };
  sessions: BusinessSession[];
  loadSessions: () => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  setLanguage: (language: Language) => void;
  setMockLogin: (mode: "counter" | "handy", connectedName?: string) => void;
  clearMockLogin: () => void;
  addSession: (name: string) => BusinessSession;
  deleteSession: (id: string) => void;
  duplicateSession: (id: string) => void;
  touchSession: (id: string) => void;
  setSort: (sortKey: SortKey) => void;
  toggleSortDirection: () => void;
};

const idFromName = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;

const sessionStorageKey = "clubx-pos:sessions";

function isBusinessSession(value: unknown): value is BusinessSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<BusinessSession>;
  return (
    typeof session.id === "string" &&
    typeof session.name === "string" &&
    typeof session.createdAt === "string" &&
    (session.lastAccessedAt === null ||
      session.lastAccessedAt === undefined ||
      typeof session.lastAccessedAt === "string")
  );
}

function readStoredSessions(): BusinessSession[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isBusinessSession).map((session) => ({
      ...session,
      lastAccessedAt: session.lastAccessedAt ?? null,
    }));
  } catch {
    return null;
  }
}

function writeStoredSessions(sessions: BusinessSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(sessions));
}

export const useAppStore = create<AppState>((set, get) => ({
  language: "ko",
  mockLogin: {
    mode: null,
  },
  sessions: mockBusinessSessions,
  loadSessions: () => {
    const storedSessions = readStoredSessions();
    const sessions = storedSessions ?? mockBusinessSessions;
    if (!storedSessions) writeStoredSessions(sessions);
    set({ sessions });
  },
  sortKey: "createdAt",
  sortDirection: "desc",
  setLanguage: (language) => set({ language }),
  setMockLogin: (mode, connectedName) => set({ mockLogin: { mode, connectedName } }),
  clearMockLogin: () => set({ mockLogin: { mode: null } }),
  addSession: (name) => {
    const now = new Date().toISOString();
    const session: BusinessSession = {
      id: idFromName(name),
      name,
      createdAt: now,
      lastAccessedAt: null,
    };

    const nextSessions = [session, ...get().sessions];
    writeStoredSessions(nextSessions);
    set({ sessions: nextSessions });
    return session;
  },
  deleteSession: (id) => {
    const nextSessions = get().sessions.filter((session) => session.id !== id);
    writeStoredSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  duplicateSession: (id) => {
    const source = get().sessions.find((session) => session.id === id);
    if (!source) return;

    const now = new Date().toISOString();
    const copy: BusinessSession = {
      id: idFromName(source.name),
      name: `${source.name} Copy`,
      createdAt: now,
      lastAccessedAt: null,
    };

    const nextSessions = [copy, ...get().sessions];
    writeStoredSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  touchSession: (id) => {
    const nextSessions = get().sessions.map((session) =>
      session.id === id
        ? { ...session, lastAccessedAt: new Date().toISOString() }
        : session,
    );
    writeStoredSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  setSort: (sortKey) => set({ sortKey }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
    })),
}));
