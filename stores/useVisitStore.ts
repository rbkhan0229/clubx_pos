"use client";

import { create } from "zustand";
import { broadcastClubxSync } from "@/lib/localSync";
import type { JoinRecord, PartyCard, TimeAdjustmentLog, Visit } from "@/types";

type WalkInResult = {
  partyCard: PartyCard;
  visit: Visit;
};

type VisitState = {
  partyCardsBySession: Record<string, PartyCard[]>;
  visitsBySession: Record<string, Visit[]>;
  joinRecordsBySession: Record<string, JoinRecord[]>;
  timeLogsByVisit: Record<string, TimeAdjustmentLog[]>;
  loadVisits: (sessionId: string) => void;
  createWalkInVisit: (sessionId: string, tableId: string | string[], guestCount?: number) => WalkInResult;
  createWaitingPartyCard: (sessionId: string, guests: PartyCard["guests"]) => PartyCard;
  getActiveVisitForTable: (sessionId: string, tableId: string) => Visit | undefined;
  getPartyCard: (sessionId: string, partyCardId: string) => PartyCard | undefined;
  upsertPartyCards: (sessionId: string, partyCards: PartyCard[]) => void;
  toggleGuestCheckIn: (sessionId: string, partyCardId: string, guestId: string) => void;
  checkInAllGuests: (sessionId: string, partyCardId: string) => void;
  updateOverdueReservations: (sessionId: string) => void;
  assignPartyCardToTable: (sessionId: string, partyCardId: string, tableId: string | string[]) => Visit | undefined;
  joinPartyCardToVisit: (
    sessionId: string,
    visitId: string,
    partyCardId: string,
    metadata?: {
      targetTableIds: string[];
      targetTableLabel: string;
      targetPreJoinOrderIds: string[];
    },
  ) => Visit | undefined;
  movePartyCardToVisit: (
    sessionId: string,
    sourceVisitId: string,
    targetVisitId: string,
    partyCardIds: string[],
    metadata?: {
      sourceTableIds: string[];
      sourceTableLabel: string;
      sourcePreJoinOrderIds: string[];
      targetTableIds: string[];
      targetTableLabel: string;
      targetPreJoinOrderIds: string[];
    },
  ) => { sourceVisit: Visit; targetVisit: Visit } | undefined;
  adjustVisitTime: (sessionId: string, visitId: string, minutes: number) => void;
  updateVisitStatus: (sessionId: string, visitId: string, status: Visit["status"]) => void;
  updateVisitTableIds: (sessionId: string, visitId: string, tableIds: string[]) => void;
  completeVisitsForTable: (sessionId: string, tableId: string) => void;
};

const partyKey = (sessionId: string) => `clubx-pos:party-cards:${sessionId}`;
const visitKey = (sessionId: string) => `clubx-pos:visits:${sessionId}`;
const joinKey = (sessionId: string) => `clubx-pos:join-records:${sessionId}`;
const logKey = (sessionId: string) => `clubx-pos:time-logs:${sessionId}`;

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
  broadcastClubxSync({ sessionId, store: "visits" });
}

function saveJoinRecords(sessionId: string, joinRecords: JoinRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(joinKey(sessionId), JSON.stringify(joinRecords));
  broadcastClubxSync({ sessionId, store: "visits" });
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

function reservationDateTime(time?: string) {
  const now = new Date();
  if (!time) return now.toISOString();
  const startTime = time.split("-")[0]?.trim() || time;
  const [hour = "0", minute = "0"] = startTime.split(":");
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) return now.toISOString();
  const next = new Date(now);
  next.setHours(parsedHour, parsedMinute, 0, 0);
  if (Number.isNaN(next.getTime())) return now.toISOString();
  return next.toISOString();
}

function reservationTimestamp(time?: string) {
  try {
    const timestamp = new Date(reservationDateTime(time)).getTime();
    return Number.isFinite(timestamp) ? timestamp : Date.now();
  } catch {
    return Date.now();
  }
}

export const useVisitStore = create<VisitState>((set, get) => ({
  partyCardsBySession: {},
  visitsBySession: {},
  joinRecordsBySession: {},
  timeLogsByVisit: {},
  loadVisits: (sessionId) => {
    if (typeof window === "undefined") return;

    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: readJson<PartyCard[]>(partyKey(sessionId), []),
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: readJson<Visit[]>(visitKey(sessionId), []),
      },
      joinRecordsBySession: {
        ...state.joinRecordsBySession,
        [sessionId]: readJson<JoinRecord[]>(joinKey(sessionId), []),
      },
      timeLogsByVisit: {
        ...state.timeLogsByVisit,
        ...readJson<Record<string, TimeAdjustmentLog[]>>(logKey(sessionId), {}),
      },
    }));
  },
  createWalkInVisit: (sessionId, tableId, guestCount = 1) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const currentVisits = get().visitsBySession[sessionId] ?? [];
    const count = currentPartyCards.filter((card) => card.type === "walkIn").length + 1;
    const code = `WALK-${String(count).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const tableIds = Array.isArray(tableId) ? tableId : [tableId];
    const partyCard: PartyCard = {
      id: `party-${sessionId}-${Date.now()}`,
      sessionId,
      type: "walkIn",
      code,
      guests: [],
      guestCount: Math.max(1, Math.floor(guestCount)),
      tableCount: 1,
      status: "seated",
      mappedTableIds: tableIds,
    };
    const visit: Visit = {
      id: `visit-${sessionId}-${Date.now()}`,
      sessionId,
      tableIds,
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
  createWaitingPartyCard: (sessionId, guests) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const count = currentPartyCards.filter((card) => card.type === "waiting").length + 1;
    const partyCard: PartyCard = {
      id: `party-${sessionId}-waiting-${Date.now()}`,
      sessionId,
      type: "waiting",
      code: `W-${String(count).padStart(3, "0")}`,
      waitingOrder: count,
      guests,
      tableCount: 1,
      status: "waiting",
      mappedTableIds: [],
    };
    const nextPartyCards = [...currentPartyCards, partyCard];
    saveVisitState(sessionId, nextPartyCards, get().visitsBySession[sessionId] ?? [], get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
    }));
    return partyCard;
  },
  getActiveVisitForTable: (sessionId, tableId) =>
    (get().visitsBySession[sessionId] ?? []).find(
      (visit) => visit.status === "active" && visit.tableIds.includes(tableId),
    ),
  getPartyCard: (sessionId, partyCardId) =>
    (get().partyCardsBySession[sessionId] ?? []).find((card) => card.id === partyCardId),
  upsertPartyCards: (sessionId, partyCards) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const incomingIds = new Set(partyCards.map((card) => card.id));
    const nextPartyCards = [
      ...currentPartyCards.filter((card) => !incomingIds.has(card.id)),
      ...partyCards,
    ];
    const visits = get().visitsBySession[sessionId] ?? [];
    saveVisitState(sessionId, nextPartyCards, visits, get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
    }));
  },
  toggleGuestCheckIn: (sessionId, partyCardId, guestId) => {
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    const nextPartyCards = partyCards.map((card) =>
      card.id === partyCardId
        ? {
            ...card,
            guests: card.guests.map((guest) =>
              guest.id === guestId ? { ...guest, checkedIn: !guest.checkedIn } : guest,
            ),
          }
        : card,
    );
    saveVisitState(sessionId, nextPartyCards, get().visitsBySession[sessionId] ?? [], get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
    }));
  },
  checkInAllGuests: (sessionId, partyCardId) => {
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    const nextPartyCards = partyCards.map((card) =>
      card.id === partyCardId
        ? {
            ...card,
            guests: card.guests.map((guest) => ({ ...guest, checkedIn: true })),
          }
        : card,
    );
    saveVisitState(sessionId, nextPartyCards, get().visitsBySession[sessionId] ?? [], get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
    }));
  },
  updateOverdueReservations: (sessionId) => {
    const now = Date.now();
    const partyCards = get().partyCardsBySession[sessionId] ?? [];
    let changed = false;
    const nextPartyCards = partyCards.map((card) => {
      if (card.type !== "reservation" || card.status === "seated" || card.status === "completed") {
        return card;
      }
      const reservationAt = reservationTimestamp(card.reservationTime);
      if (reservationAt < now && card.status !== "overdue") {
        changed = true;
        return { ...card, status: "overdue" as const };
      }
      if (reservationAt >= now && card.status === "overdue") {
        changed = true;
        return { ...card, status: "waiting" as const };
      }
      return card;
    });
    if (!changed) return;
    saveVisitState(sessionId, nextPartyCards, get().visitsBySession[sessionId] ?? [], get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
    }));
  },
  assignPartyCardToTable: (sessionId, partyCardId, tableId) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const currentVisits = get().visitsBySession[sessionId] ?? [];
    const partyCard = currentPartyCards.find((card) => card.id === partyCardId);
    if (!partyCard || partyCard.status === "seated" || partyCard.status === "completed") return undefined;

    const now = new Date().toISOString();
    const startAt =
      partyCard.type === "reservation" ? reservationDateTime(partyCard.reservationTime) : now;
    const tableIds = Array.isArray(tableId) ? tableId : [tableId];
    const visit: Visit = {
      id: `visit-${sessionId}-${partyCardId}-${Date.now()}`,
      sessionId,
      tableIds,
      partyCardIds: [partyCard.id],
      sourceType: partyCard.type,
      sourceId: partyCard.id,
      visitCode: partyCard.code,
      startedAt: now,
      expectedEndAt: addMinutes(startAt, 90),
      status: "active",
    };
    const nextPartyCards = currentPartyCards.map((card) =>
      card.id === partyCardId
        ? { ...card, status: "seated" as const, mappedTableIds: tableIds }
        : card,
    );
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
    return visit;
  },
  joinPartyCardToVisit: (sessionId, visitId, partyCardId, metadata) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const currentVisits = get().visitsBySession[sessionId] ?? [];
    const partyCard = currentPartyCards.find((card) => card.id === partyCardId);
    const targetVisit = currentVisits.find((visit) => visit.id === visitId && visit.status === "active");
    if (
      !partyCard ||
      partyCard.status === "seated" ||
      partyCard.status === "completed" ||
      !targetVisit ||
      targetVisit.partyCardIds.includes(partyCardId)
    ) {
      return undefined;
    }

    const now = new Date().toISOString();
    const currentJoinRecords = get().joinRecordsBySession[sessionId] ?? [];
    const joinRecord: JoinRecord = {
      id: `join-${sessionId}-${Date.now()}`,
      sessionId,
      targetVisitId: visitId,
      targetTableIds: metadata?.targetTableIds ?? targetVisit.tableIds,
      addedPartyCardId: partyCardId,
      joinedAt: now,
      targetTableLabel: metadata?.targetTableLabel ?? targetVisit.visitCode,
      targetPreJoinOrderIds: metadata?.targetPreJoinOrderIds ?? [],
    };
    const nextJoinRecords = [...currentJoinRecords, joinRecord];
    let joinedVisit: Visit | undefined;
    const nextVisits = currentVisits.map((visit) => {
      if (visit.id !== visitId) return visit;
      joinedVisit = {
        ...visit,
        partyCardIds: [...visit.partyCardIds, partyCardId],
        sourceType: "joined",
        isJoined: true,
        joinedAt: visit.joinedAt ?? now,
      };
      return joinedVisit;
    });
    const nextPartyCards = currentPartyCards.map((card) =>
      card.id === partyCardId
        ? { ...card, status: "seated" as const, mappedTableIds: targetVisit.tableIds }
        : card,
    );

    saveVisitState(sessionId, nextPartyCards, nextVisits, get().timeLogsByVisit);
    saveJoinRecords(sessionId, nextJoinRecords);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
      joinRecordsBySession: {
        ...state.joinRecordsBySession,
        [sessionId]: nextJoinRecords,
      },
    }));
    return joinedVisit;
  },
  movePartyCardToVisit: (sessionId, sourceVisitId, targetVisitId, partyCardIds, metadata) => {
    const currentPartyCards = get().partyCardsBySession[sessionId] ?? [];
    const currentVisits = get().visitsBySession[sessionId] ?? [];
    const movingIds = [...new Set(partyCardIds)];
    const movingIdSet = new Set(movingIds);
    const movingCards = currentPartyCards.filter((card) => movingIdSet.has(card.id));
    const sourceVisit = currentVisits.find(
      (visit) => visit.id === sourceVisitId && visit.status === "active",
    );
    const targetVisit = currentVisits.find(
      (visit) => visit.id === targetVisitId && visit.status === "active",
    );

    if (
      movingIds.length === 0 ||
      movingCards.length !== movingIds.length ||
      !sourceVisit ||
      !targetVisit ||
      sourceVisit.id === targetVisit.id ||
      sourceVisit.partyCardIds.length !== movingIds.length ||
      !sourceVisit.partyCardIds.every((partyCardId) => movingIdSet.has(partyCardId)) ||
      movingIds.some((partyCardId) => targetVisit.partyCardIds.includes(partyCardId))
    ) {
      return undefined;
    }

    const now = new Date().toISOString();
    const currentJoinRecords = get().joinRecordsBySession[sessionId] ?? [];
    const joinRecord: JoinRecord = {
      id: `join-${sessionId}-${Date.now()}`,
      sessionId,
      targetVisitId,
      sourceVisitId,
      targetTableIds: metadata?.targetTableIds ?? targetVisit.tableIds,
      sourceTableIds: metadata?.sourceTableIds ?? sourceVisit.tableIds,
      movedPartyCardId: movingIds[0],
      addedPartyCardId: movingIds[0],
      addedPartyCardIds: movingIds,
      joinedAt: now,
      targetTableLabel: metadata?.targetTableLabel ?? targetVisit.visitCode,
      sourceTableLabel: metadata?.sourceTableLabel ?? sourceVisit.visitCode,
      targetPreJoinOrderIds: metadata?.targetPreJoinOrderIds ?? [],
      sourcePreJoinOrderIds: metadata?.sourcePreJoinOrderIds ?? [],
    };
    const nextJoinRecords = [...currentJoinRecords, joinRecord];
    let nextSourceVisit: Visit | undefined;
    let nextTargetVisit: Visit | undefined;
    const nextVisits = currentVisits.map((visit) => {
      if (visit.id === sourceVisitId) {
        nextSourceVisit = {
          ...visit,
          status: "completed",
        };
        return nextSourceVisit;
      }

      if (visit.id === targetVisitId) {
        nextTargetVisit = {
          ...visit,
          partyCardIds: [...visit.partyCardIds, ...movingIds],
          sourceType: "joined",
          isJoined: true,
          joinedAt: visit.joinedAt ?? now,
        };
        return nextTargetVisit;
      }

      return visit;
    });

    if (!nextSourceVisit || !nextTargetVisit) return undefined;
    const movedSourceVisit = nextSourceVisit;
    const movedTargetVisit = nextTargetVisit;

    const nextPartyCards = currentPartyCards.map((card) =>
      movingIdSet.has(card.id)
        ? {
            ...card,
            status: "seated" as const,
            mappedTableIds: movedTargetVisit.tableIds,
          }
        : card,
    );

    saveVisitState(sessionId, nextPartyCards, nextVisits, get().timeLogsByVisit);
    saveJoinRecords(sessionId, nextJoinRecords);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: nextPartyCards,
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
      joinRecordsBySession: {
        ...state.joinRecordsBySession,
        [sessionId]: nextJoinRecords,
      },
    }));

    return { sourceVisit: movedSourceVisit, targetVisit: movedTargetVisit };
  },
  adjustVisitTime: (sessionId, visitId, minutes) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const nextVisits = visits.map((visit) =>
      visit.id === visitId
        ? {
            ...visit,
            expectedEndAt:
              minutes > 0 && new Date(visit.expectedEndAt).getTime() < Date.now()
                ? addMinutes(new Date().toISOString(), minutes)
                : addMinutes(visit.expectedEndAt, minutes),
          }
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
  updateVisitTableIds: (sessionId, visitId, tableIds) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const visit = visits.find((item) => item.id === visitId);
    const nextVisits = visits.map((visit) =>
      visit.id === visitId ? { ...visit, tableIds } : visit,
    );
    const mappedPartyCardIds = new Set(visit?.partyCardIds ?? []);
    const partyCards = (get().partyCardsBySession[sessionId] ?? []).map((card) =>
      mappedPartyCardIds.has(card.id) ? { ...card, mappedTableIds: tableIds } : card,
    );
    saveVisitState(sessionId, partyCards, nextVisits, get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: partyCards,
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
    }));
  },
  completeVisitsForTable: (sessionId, tableId) => {
    const visits = get().visitsBySession[sessionId] ?? [];
    const completingPartyCardIds = visits
      .filter((visit) => visit.tableIds.includes(tableId) && visit.status !== "completed")
      .flatMap((visit) => visit.partyCardIds);
    const nextVisits = visits.map((visit) =>
      visit.tableIds.includes(tableId) && visit.status !== "completed"
        ? { ...visit, status: "completed" as const }
        : visit,
    );
    const completedIds = new Set(completingPartyCardIds);
    const partyCards = (get().partyCardsBySession[sessionId] ?? []).map((card) =>
      completedIds.has(card.id) ? { ...card, status: "completed" as const } : card,
    );
    saveVisitState(sessionId, partyCards, nextVisits, get().timeLogsByVisit);
    set((state) => ({
      partyCardsBySession: {
        ...state.partyCardsBySession,
        [sessionId]: partyCards,
      },
      visitsBySession: {
        ...state.visitsBySession,
        [sessionId]: nextVisits,
      },
    }));
  },
}));
