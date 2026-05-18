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

export const useAppStore = create<AppState>((set, get) => ({
  language: "ko",
  mockLogin: {
    mode: null,
  },
  sessions: mockBusinessSessions,
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

    set((state) => ({ sessions: [session, ...state.sessions] }));
    return session;
  },
  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    })),
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

    set((state) => ({ sessions: [copy, ...state.sessions] }));
  },
  touchSession: (id) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? { ...session, lastAccessedAt: new Date().toISOString() }
          : session,
      ),
    })),
  setSort: (sortKey) => set({ sortKey }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
    })),
}));
