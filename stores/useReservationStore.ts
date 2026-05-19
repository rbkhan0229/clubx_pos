"use client";

import { create } from "zustand";
import {
  buildReservationPartyCards,
  buildReservationSource,
  mockClubXEvents,
} from "@/lib/mock/reservations";
import { broadcastClubxSync } from "@/lib/localSync";
import { useVisitStore } from "@/stores/useVisitStore";
import type { ReservationSource } from "@/types";

type ReservationState = {
  sourcesBySession: Record<string, ReservationSource | null>;
  selectedPartyCardIdBySession: Record<string, string | null>;
  loadReservationSource: (sessionId: string) => void;
  importMockReservations: (sessionId: string, eventId: string) => void;
  selectPartyCardForAssignment: (sessionId: string, partyCardId: string | null) => void;
};

const sourceKey = (sessionId: string) => `clubx-pos:reservation-source:${sessionId}`;

function saveSource(sessionId: string, source: ReservationSource) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sourceKey(sessionId), JSON.stringify(source));
  broadcastClubxSync({ sessionId, store: "reservations" });
}

export const useReservationStore = create<ReservationState>((set) => ({
  sourcesBySession: {},
  selectedPartyCardIdBySession: {},
  loadReservationSource: (sessionId) => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(sourceKey(sessionId));
    let source: ReservationSource | null = null;
    if (raw) {
      try {
        source = JSON.parse(raw) as ReservationSource;
      } catch {
        window.localStorage.removeItem(sourceKey(sessionId));
      }
    }
    set((state) => ({
      sourcesBySession: {
        ...state.sourcesBySession,
        [sessionId]: source,
      },
    }));
  },
  importMockReservations: (sessionId, eventId) => {
    const event = mockClubXEvents.find((item) => item.eventId === eventId);
    if (!event) return;
    const source = buildReservationSource(sessionId, event);
    const partyCards = buildReservationPartyCards(sessionId, source);
    const visitStore = useVisitStore.getState();
    saveSource(sessionId, source);
    visitStore.upsertPartyCards(sessionId, partyCards);
    visitStore.updateOverdueReservations(sessionId);
    set((state) => ({
      sourcesBySession: {
        ...state.sourcesBySession,
        [sessionId]: source,
      },
      selectedPartyCardIdBySession: {
        ...state.selectedPartyCardIdBySession,
        [sessionId]: null,
      },
    }));
  },
  selectPartyCardForAssignment: (sessionId, partyCardId) =>
    set((state) => ({
      selectedPartyCardIdBySession: {
        ...state.selectedPartyCardIdBySession,
        [sessionId]: partyCardId,
      },
    })),
}));
