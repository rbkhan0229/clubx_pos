import type { BusinessSession } from "@/types";

export const mockBusinessSessions: BusinessSession[] = [
  {
    id: "main-night",
    name: "Main Pub Night",
    createdAt: "2026-05-17T18:00:00.000Z",
    lastAccessedAt: "2026-05-17T22:30:00.000Z",
  },
  {
    id: "after-party",
    name: "After Party Counter",
    createdAt: "2026-05-18T08:15:00.000Z",
    lastAccessedAt: null,
  },
];
