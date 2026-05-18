"use client";

import { create } from "zustand";
import type { PartyCard, TimeAdjustmentLog, Visit } from "@/types";

type WalkInResult = {
  partyCard: PartyCard;
  visit: Visit;
};

type VisitState = {
  partyCardsBySession: Record<string, PartyCard[]>;
  visitsBySession: Record<string, Visit[]>;
  timeLogsByVisit: Record<string, TimeAdjustmentLog[]>;
  loadVisits: (sessionId: string) => void;
  createWalkInVisit: (sessionId: string, tableId: string) => WalkInResult;
  getActiveVisitForTable: (sessionId: string, tableId: string) => Visit | undefined;
  getPartyCard: (sessionId: string, partyCardId: string) => PartyCard | undefined;
  adjustVisitTime: (sessionId: string, visitId: string, minutes: number) => void;
  updateVisitStatus: (sessionId: string, visitId: string, status: Visit["status"]) => void;
  completeVisitsForTable: (sessionId: string, tableId: string) => void;
};

const partyKey = (sessionId: string) => `clubx-pos:party-cards:${sessionId}`;
const visitKey = (sessionId: string) => `clubx-pos:visits:${sessionId}`;
const logKey = (sessionId: string) => `clubx-pos:time-logs:${sessionId}`;

function saveVisitState(
  sessionId: string,
  partyCards: PartyCard[],
  visits: Visit[],
  logsByVisit: Record<string, TimeAdjustmentLog[]>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(partyKey(sessionId), JSON.stringify(partyCards));
  window.localStorage.setItem(visitKey(sessionId), JSON.stringify(visits));
  window.localStorage.setItem(logKey(sessionId), JSON.stringify(logsByVisit));
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

export const useVisitStore = create<VisitState>((set, get) => ({
  partyCardsBySession: {},
  visitsBySession: {},
  timeLogsByVisit: {},
  loadVisits: (sessionId) => {
    if (typeof window === "undefined") return;

    const rawPartyCards = window.localStorage.getItem(partyKey(sessionId));
    const rawVisits = window.localStorage.getItem(visitKey(sessionId));
    const rawLogs = window.localStorage.getItem(logKey(sessionId));
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: rawPartyCards ? (JSON.parse(rawPartyCards) as PartyCard[]) : [],
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: rawVisits ? (JSON.parse(rawVisits) as Visit[]) : [],
      },
      timeLogsByVisit: {
        ...state.timeLogsByVisit,
        ...(rawLogs ? (JSON.parse(rawLogs) as Record<string, TimeAdjustmentLog[]>) : {}),
      },
    }));
  },
  createWalkInVisit: (sessionId, tableId) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const currentVisits = get().visitsBySession[sessionId] ?? [];
    const count = currentPartyCards.filter((card) => card.type === "walkIn").length + 1;
    const code = `WALK-${String(count).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const partyCard: PartyCard = {
      id: `party-${sessionId}-${Date.now()}`,
      sessionId,
      type: "walkIn",
      code,
      guests: [],
      tableCount: 1,
      status: "seated",
    };
    const visit: Visit = {
      id: `visit-${sessionId}-${Date.now()}`,
      sessionId,
      tableIds: [tableId],
      partyCardIds: [partyCard.id],
      sourceType: "walkIn",
      sourceId: partyCard.id,
      visitCode: code,
      startedAt: now,
      expectedEndAt: addMinutes(now, 90),
      status: "active",
    };

    const nextPartyCards = [...currentPartyCards, partyCard];
    const nextVisits = [...currentVisits, visit];
    saveVisitState(sessionId, nextPartyCards, nextVisits, get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
    }));

    return { partyCard, visit };
  },
  getActiveVisitForTable: (sessionId, tableId) =>
    (get().visitsBySession[sessionId] ?? []).find(
      (visit) => visit.status === "active" && visit.tableIds.includes(tableId),
    ),
  getPartyCard: (sessionId, partyCardId) =>
    (get().partyCardsBySession[sessionId] ?? []).find((card) => card.id === partyCardId),
  adjustVisitTime: (sessionId, visitId, minutes) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const nextVisits = visits.map((visit) =>
      visit.id === visitId
        ? { ...visit, expectedEndAt: addMinutes(visit.expectedEndAt, minutes) }
        : visit,
    );
    const log: TimeAdjustmentLog = {
      id: `time-log-${visitId}-${Date.now()}`,
      visitId,
      minutes,
      messageKo:
        minutes > 0
          ? `카운터가 ${Math.abs(minutes)}분 연장했습니다.`
          : `카운터가 ${Math.abs(minutes)}분 차감했습니다.`,
      messageEn:
        minutes > 0
          ? `Counter added ${Math.abs(minutes)} minutes.`
          : `Counter removed ${Math.abs(minutes)} minutes.`,
      createdAt: new Date().toISOString(),
    };
    const nextLogs = {
      ...get().timeLogsByVisit,
      [visitId]: [...(get().timeLogsByVisit[visitId] ?? []), log],
    };
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    saveVisitState(sessionId, partyCards, nextVisits, nextLogs);
    set((state) => ({
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
      timeLogsByVisit: nextLogs,
    }));
  },
  updateVisitStatus: (sessionId, visitId, status) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const nextVisits = visits.map((visit) =>
      visit.id === visitId ? { ...visit, status } : visit,
    );
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    saveVisitState(sessionId, partyCards, nextVisits, get().timeLogsByVisit);
    set((state) => ({
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
    }));
  },
  completeVisitsForTable: (sessionId, tableId) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const nextVisits = visits.map((visit) =>
      visit.tableIds.includes(tableId) && visit.status !== "completed"
        ? { ...visit, status: "completed" as const }
        : visit,
    );
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    saveVisitState(sessionId, partyCards, nextVisits, get().timeLogsByVisit);
    set((state) => ({
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
    }));
  },
}));
