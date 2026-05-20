"use client";

import { create } from "zustand";
import { mockBusinessSessions } from "@/lib/mock/sessions";
import { getPosRepositories, getPosRepositoryMode } from "@/lib/pos/repositories";
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
  sessionsLoading: boolean;
  sessionsError: string | null;
  loadSessions: () => Promise<void>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  setLanguage: (language: Language) => void;
  setMockLogin: (mode: "counter" | "handy", connectedName?: string) => void;
  clearMockLogin: () => void;
  addSession: (name: string) => Promise<BusinessSession>;
  deleteSession: (id: string) => Promise<void>;
  duplicateSession: (id: string) => Promise<void>;
  touchSession: (id: string) => Promise<void>;
  setSort: (sortKey: SortKey) => void;
  toggleSortDirection: () => void;
};

function sessionFailureMessage() {
  return "Failed to load server sessions.";
}

function writeLocalSessions(sessions: BusinessSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("clubx-pos:sessions", JSON.stringify(sessions));
}

function setSessionFailure(
  set: (partial: Partial<AppState>) => void,
  error: unknown,
) {
  set({
    sessionsLoading: false,
    sessionsError: error instanceof Error ? error.message : sessionFailureMessage(),
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  language: "ko",
  mockLogin: {
    mode: null,
  },
  sessions: mockBusinessSessions,
  sessionsLoading: false,
  sessionsError: null,
  loadSessions: async () => {
    const mode = getPosRepositoryMode();
    const repositories = getPosRepositories();
    set({ sessionsLoading: mode === "server", sessionsError: null });
    try {
      const sessions = await repositories.sessions.list();
      set({ sessions, sessionsLoading: false, sessionsError: null });
    } catch (error) {
      setSessionFailure(set, error);
    }
  },
  sortKey: "createdAt",
  sortDirection: "desc",
  setLanguage: (language) => set({ language }),
  setMockLogin: (mode, connectedName) => set({ mockLogin: { mode, connectedName } }),
  clearMockLogin: () => set({ mockLogin: { mode: null } }),
  addSession: async (name) => {
    const mode = getPosRepositoryMode();
    const repositories = getPosRepositories();
    set({ sessionsLoading: mode === "server", sessionsError: null });
    try {
      const session = await repositories.sessions.create({ name });
      set((state) => ({
        sessions: [session, ...state.sessions.filter((item) => item.id !== session.id)],
        sessionsLoading: false,
        sessionsError: null,
      }));
      return session;
    } catch (error) {
      setSessionFailure(set, error);
      throw error;
    }
  },
  deleteSession: async (id) => {
    const mode = getPosRepositoryMode();
    const repositories = getPosRepositories();
    set({ sessionsLoading: mode === "server", sessionsError: null });
    try {
      // Server mode delete is implemented as close/archive.
      await repositories.sessions.close(id);
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== id),
        sessionsLoading: false,
        sessionsError: null,
      }));
    } catch (error) {
      setSessionFailure(set, error);
      throw error;
    }
  },
  duplicateSession: async (id) => {
    const mode = getPosRepositoryMode();
    const repositories = getPosRepositories();
    set({ sessionsLoading: mode === "server", sessionsError: null });
    try {
      const source =
        get().sessions.find((session) => session.id === id) ??
        (await repositories.sessions.get(id));
      if (!source) {
        set({ sessionsLoading: false, sessionsError: null });
        return;
      }
      // TODO: Server mode currently creates a shell copy only. Deep duplication
      // of tables/orders/payments should be added after those stores migrate.
      const copy = await repositories.sessions.create({ name: `${source.name} Copy` });
      set((state) => ({
        sessions: [copy, ...state.sessions.filter((session) => session.id !== copy.id)],
        sessionsLoading: false,
        sessionsError: null,
      }));
    } catch (error) {
      setSessionFailure(set, error);
      throw error;
    }
  },
  touchSession: async (id) => {
    // Backend Phase 13A does not store last-accessed data yet, so server mode
    // keeps this as a local dashboard UX update only.
    const nextSessions = get().sessions.map((session) =>
      session.id === id
        ? { ...session, lastAccessedAt: new Date().toISOString() }
        : session,
    );
    if (getPosRepositoryMode() === "local") writeLocalSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  setSort: (sortKey) => set({ sortKey }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
    })),
}));
