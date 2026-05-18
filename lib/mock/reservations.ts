import type { Guest, PartyCard, ReservationSource } from "@/types";

export type MockClubXEvent = {
  eventId: string;
  eventName: string;
  date: string;
  reservationCount: number;
};

type MockReservation = {
  reservationNumber: string;
  reservationTime: string;
  guests: Guest[];
  tableCount: number;
};

export const mockClubXEvents: MockClubXEvent[] = [
  {
    eventId: "clubx-pub-night",
    eventName: "ClubX Pub Night",
    date: "2026-05-18",
    reservationCount: 5,
  },
  {
    eventId: "festival-booth-day-1",
    eventName: "Festival Booth Day 1",
    date: "2026-05-19",
    reservationCount: 4,
  },
  {
    eventId: "festival-booth-day-2",
    eventName: "Festival Booth Day 2",
    date: "2026-05-20",
    reservationCount: 4,
  },
];

const reservationsByEvent: Record<string, MockReservation[]> = {
  "clubx-pub-night": [
    reservation("R-001", "17:30", 1, [
      guest("김민준", "010-1111-2301", "minjun"),
      guest("박서연", "010-1111-2302", "seoyeon"),
    ]),
    reservation("R-002", "18:00", 1, [
      guest("이지원", "010-2222-1800", "jiwon"),
      guest("최유나", "010-2222-1801"),
      guest("정하준", "010-2222-1802"),
    ]),
    reservation("R-003", "18:30", 2, [
      guest("강도윤", "010-3333-1830", "doyun"),
      guest("윤서아", "010-3333-1831", "seoa"),
      guest("오지후", "010-3333-1832"),
      guest("한채원", "010-3333-1833"),
    ]),
    reservation("R-004", "19:00", 1, [
      guest("송현우", "010-4444-1900", "hyunwoo"),
      guest("문예린", "010-4444-1901"),
    ]),
    reservation("R-005", "19:30", 1, [
      guest("임지민", "010-5555-1930", "jimin"),
      guest("백시우", "010-5555-1931"),
    ]),
  ],
  "festival-booth-day-1": [
    reservation("D1-001", "18:00", 1, [guest("이서준", "010-1010-1800", "seojun")]),
    reservation("D1-002", "18:30", 1, [
      guest("김하린", "010-2020-1830"),
      guest("장민서", "010-2020-1831", "minseo"),
    ]),
    reservation("D1-003", "19:00", 2, [
      guest("조은우", "010-3030-1900"),
      guest("신아윤", "010-3030-1901", "ayun"),
      guest("권도현", "010-3030-1902"),
    ]),
    reservation("D1-004", "19:30", 1, [guest("홍지아", "010-4040-1930", "jia")]),
  ],
  "festival-booth-day-2": [
    reservation("D2-001", "17:30", 1, [
      guest("서연우", "010-5050-1730", "yeonwoo"),
      guest("남유진", "010-5050-1731"),
    ]),
    reservation("D2-002", "18:00", 1, [guest("배준서", "010-6060-1800")]),
    reservation("D2-003", "19:00", 2, [
      guest("안서윤", "010-7070-1900", "seoyun"),
      guest("유지호", "010-7070-1901"),
      guest("차하은", "010-7070-1902"),
      guest("노지안", "010-7070-1903"),
    ]),
    reservation("D2-004", "19:30", 1, [guest("황민재", "010-8080-1930", "minjae")]),
  ],
};

export function buildReservationSource(
  sessionId: string,
  event: MockClubXEvent,
): ReservationSource {
  return {
    id: `source-${sessionId}-${event.eventId}`,
    sessionId,
    eventId: event.eventId,
    eventName: event.eventName,
    date: event.date,
    importedAt: new Date().toISOString(),
    reservationCount: event.reservationCount,
  };
}

export function buildReservationPartyCards(
  sessionId: string,
  source: ReservationSource,
): PartyCard[] {
  return (reservationsByEvent[source.eventId] ?? []).map((item) => ({
    id: `party-${sessionId}-${source.eventId}-${item.reservationNumber}`,
    sessionId,
    type: "reservation",
    code: item.reservationNumber,
    reservationTime: item.reservationTime,
    guests: item.guests,
    tableCount: item.tableCount,
    status: "waiting",
    sourceId: source.id,
    mappedTableIds: [],
  }));
}

function reservation(
  reservationNumber: string,
  reservationTime: string,
  tableCount: number,
  guests: Guest[],
): MockReservation {
  return { reservationNumber, reservationTime, guests, tableCount };
}

function guest(name: string, phone: string, username?: string): Guest {
  return {
    id: `guest-${name}-${phone}`,
    name,
    phone,
    username,
    checkedIn: false,
  };
}
