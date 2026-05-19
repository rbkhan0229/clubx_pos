"use client";

import { create } from "zustand";
import {
  buildReservationPartyCards,
  buildReservationSource,
  mockClubXEvents,
} from "@/lib/mock/reservations";
import { api } from "@/lib/api/client";
import { broadcastClubxSync } from "@/lib/localSync";
import { useVisitStore } from "@/stores/useVisitStore";
import type { AdminReservation, AdminReservationListResponse } from "@/lib/api/types";
import type { Guest, PartyCard, ReservationSource } from "@/types";

const PUBLIC_SOURCE_ID = "public-pub-reservations";
const INACTIVE_RESERVATION_STATUSES = new Set(["cancelled", "deleted", "hidden"]);

type ReservationState = {
  sourcesBySession: Record<string, ReservationSource | null>;
  selectedPartyCardIdBySession: Record<string, string | null>;
  loadReservationSource: (sessionId: string) => void;
  importMockReservations: (sessionId: string, eventId: string) => void;
  syncPublicReservations: (sessionId: string) => Promise<void>;
  importPublicReservationsSnapshot: (sessionId: string, reservations: AdminReservation[]) => void;
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
  syncPublicReservations: async (sessionId) => {
    try {
      const response = await api.get<AdminReservationListResponse>(
        "/admin/pub-reservations/reservations",
        { limit: 500 },
      );
      const reservations = normalizeReservationList(response);
      useReservationStore.getState().importPublicReservationsSnapshot(sessionId, reservations);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync public reservations";
      const source = publicReservationSource(sessionId, 0, "error", message);
      saveSource(sessionId, source);
      set((state) => ({
        sourcesBySession: {
          ...state.sourcesBySession,
          [sessionId]: source,
        },
      }));
      throw error;
    }
  },
  importPublicReservationsSnapshot: (sessionId, reservations) => {
    const visitStore = useVisitStore.getState();
    const currentCards = visitStore.partyCardsBySession[sessionId] ?? [];
    const source = publicReservationSource(sessionId, reservations.length, "success");
    const partyCards = mergePublicReservationsIntoPartyCards(sessionId, reservations, currentCards);

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

function normalizeReservationList(response: AdminReservationListResponse | AdminReservation[]) {
  if (Array.isArray(response)) return response;
  return response.data ?? response.items ?? response.reservations ?? [];
}

function publicReservationSource(
  sessionId: string,
  reservationCount: number,
  syncStatus: ReservationSource["syncStatus"],
  errorMessage?: string,
): ReservationSource {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: PUBLIC_SOURCE_ID,
    sessionId,
    eventId: PUBLIC_SOURCE_ID,
    eventName: "Public Pub Reservations",
    date: today,
    importedAt: new Date().toISOString(),
    reservationCount,
    syncStatus,
    errorMessage,
  };
}

function mergePublicReservationsIntoPartyCards(
  sessionId: string,
  reservations: AdminReservation[],
  currentCards: PartyCard[],
) {
  const existingById = new Map(currentCards.map((card) => [card.id, card]));
  const incomingActiveIds = new Set<string>();
  const nextCards: PartyCard[] = [];

  reservations.forEach((reservation) => {
    const cardId = publicReservationPartyCardId(reservation.id);
    const existing = existingById.get(cardId);
    const upstreamStatus = String(reservation.status ?? "").toLowerCase();

    if (INACTIVE_RESERVATION_STATUSES.has(upstreamStatus)) {
      if (existing && isActiveTableOperation(existing)) {
        nextCards.push({ ...existing, upstreamStatus });
      }
      return;
    }

    incomingActiveIds.add(cardId);
    nextCards.push(adminReservationToPartyCard(sessionId, reservation, existing));
  });

  currentCards.forEach((card) => {
    if (card.sourceId !== PUBLIC_SOURCE_ID) return;
    if (incomingActiveIds.has(card.id)) return;
    if (isActiveTableOperation(card)) {
      nextCards.push({ ...card, upstreamStatus: card.upstreamStatus ?? "missing" });
    }
  });

  return nextCards;
}

function adminReservationToPartyCard(
  sessionId: string,
  reservation: AdminReservation,
  existing?: PartyCard,
): PartyCard {
  const checkedInByStableKey = new Map(
    (existing?.guests ?? []).map((guest) => [guestStableKey(guest), guest.checkedIn]),
  );
  const guests = buildGuests(reservation, checkedInByStableKey);

  return {
    id: publicReservationPartyCardId(reservation.id),
    sessionId,
    type: "reservation",
    code: reservation.reservation_code,
    reservationTime: `${reservation.start_label}-${reservation.end_label}`,
    guests,
    guestCount: reservation.total_party_size,
    tableCount: reservation.table_count,
    status:
      existing?.status === "seated" || existing?.status === "completed"
        ? existing.status
        : "waiting",
    sourceId: PUBLIC_SOURCE_ID,
    mappedTableIds: existing?.mappedTableIds ?? [],
    upstreamStatus: reservation.status,
  };
}

function buildGuests(
  reservation: AdminReservation,
  checkedInByStableKey: Map<string, boolean>,
): Guest[] {
  const guests = reservation.guests.length
    ? reservation.guests
    : [{
        id: `${reservation.id}:contact`,
        name: reservation.contact_name,
        phone: reservation.contact_phone ?? reservation.contact_phone_masked,
      }];

  return guests.map((guest, index) => {
    const phone = guest.phone ?? guest.phone_masked ?? null;
    const name = guest.name || (index === 0 ? reservation.contact_name : `Guest ${index + 1}`);
    const normalized: Guest = {
      id: guest.id ? `pub-guest:${guest.id}` : `pub-guest:${reservation.id}:${index}`,
      name,
      phone: phone ?? undefined,
      username: guest.username ?? guest.clubx_username ?? undefined,
      checkedIn: false,
    };
    normalized.checkedIn =
      checkedInByStableKey.get(guestStableKey(normalized)) ?? Boolean(guest.checked_in);
    return normalized;
  });
}

function guestStableKey(guest: Pick<Guest, "name" | "phone" | "username">) {
  return `${guest.name}|${guest.phone ?? ""}|${guest.username ?? ""}`;
}

function publicReservationPartyCardId(reservationId: string) {
  return `pub-reservation:${reservationId}`;
}

function isActiveTableOperation(card: PartyCard) {
  return card.status === "seated" || card.status === "completed" || Boolean(card.mappedTableIds?.length);
}
