"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Hourglass,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { mockClubXEvents } from "@/lib/mock/reservations";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import { useReservationStore } from "@/stores/useReservationStore";
import { useVisitStore } from "@/stores/useVisitStore";
import { useWaitingStore } from "@/stores/useWaitingStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import type { PartyCard, StaffDevice, WaitingSite } from "@/types";
import type { SidebarTab } from "@/types";

const EMPTY_PARTY_CARDS: PartyCard[] = [];
const EMPTY_WAITING_SITES: WaitingSite[] = [];

const tabs: Array<{
  id: SidebarTab;
  labelKey: keyof ReturnType<typeof getDictionary>;
  shortLabel: string;
  icon: ReactNode;
}> = [
  {
    id: "reservation",
    labelKey: "reservationManagement",
    shortLabel: "R",
    icon: <CalendarClock size={17} />,
  },
  {
    id: "waiting",
    labelKey: "waitingManagement",
    shortLabel: "W",
    icon: <Hourglass size={17} />,
  },
  {
    id: "reservationSource",
    labelKey: "reservationSourceControl",
    shortLabel: "S",
    icon: <UploadCloud size={17} />,
  },
  {
    id: "handyDevice",
    labelKey: "handyOrderDeviceManagement",
    shortLabel: "H",
    icon: <Smartphone size={17} />,
  },
];

export function RightSidebar({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const activeSidebarTab = useWorkspaceStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useWorkspaceStore((state) => state.setActiveSidebarTab);

  return (
    <aside
      aria-hidden={!sidebarOpen}
      className={`relative z-20 overflow-hidden border-t border-slate-200 bg-white shadow-sm transition-[width,opacity] lg:min-h-screen lg:border-l lg:border-t-0 ${
        sidebarOpen
          ? "w-full opacity-100 lg:h-screen lg:w-[360px]"
          : "h-0 w-0 border-0 opacity-0 lg:h-auto lg:w-0"
      }`}
    >
      <div className="flex h-full min-h-[320px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 p-2">
          {tabs.map((tab) => (
            <button
              aria-label={t[tab.labelKey]}
              className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black transition ${
                activeSidebarTab === tab.id
                  ? "bg-club-acid text-club-black shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-lime-50"
              }`}
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              title={t[tab.labelKey]}
              type="button"
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <SidebarContent activeTab={activeSidebarTab} sessionId={sessionId} />
        </div>
      </div>
    </aside>
  );
}

function SidebarContent({ activeTab, sessionId }: { activeTab: SidebarTab; sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);

  if (activeTab === "reservation") {
    return <ReservationManagementPanel sessionId={sessionId} />;
  }

  if (activeTab === "waiting") {
    return <WaitingManagementPanel sessionId={sessionId} />;
  }

  if (activeTab === "reservationSource") {
    return <ReservationSourcePanel sessionId={sessionId} />;
  }

  return (
    <HandyDevicePanel sessionId={sessionId} />
  );
}

function ReservationSourcePanel({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadReservationSource = useReservationStore((state) => state.loadReservationSource);
  const importMockReservations = useReservationStore((state) => state.importMockReservations);
  const source = useReservationStore((state) => state.sourcesBySession[sessionId]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadReservationSource(sessionId);
  }, [loadReservationSource, sessionId]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.sessionId && payload.sessionId !== sessionId) return;
        if (payload.store === "reservations") loadReservationSource(sessionId);
      }),
    [loadReservationSource, sessionId],
  );

  const filteredEvents = mockClubXEvents.filter((event) =>
    event.eventName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Button onClick={() => setSearchOpen((value) => !value)}>
        {t.importFromClubX}
      </Button>

      {source ? (
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs font-black uppercase text-club-green">
            {t.selectedReservationSource}
          </p>
          <p className="mt-1 text-lg font-black">{source.eventName}</p>
          <p className="text-sm font-bold text-slate-500">
            {source.date} · {t.reservationCount}: {source.reservationCount}
          </p>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="grid gap-3">
          <input
            className="touch-target rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-club-green"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.reservationSearchPlaceholder}
            value={query}
          />
          <div className="grid gap-2">
            {filteredEvents.map((event) => (
              <div className="rounded-2xl bg-white p-3" key={event.eventId}>
                <p className="font-black">{event.eventName}</p>
                <p className="text-xs font-bold text-slate-500">
                  {event.date} · {t.reservationCount}: {event.reservationCount}
                </p>
                <Button
                  className="mt-3 min-h-0 w-full px-3 py-2"
                  onClick={() => {
                    importMockReservations(sessionId, event.eventId);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  {t.selectEvent}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WaitingManagementPanel({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadWaitingSites = useWaitingStore((state) => state.loadWaitingSites);
  const createWaitingSite = useWaitingStore((state) => state.createWaitingSite);
  const sites = useWaitingStore((state) => state.sitesBySession[sessionId] ?? EMPTY_WAITING_SITES);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWaitingSites();
  }, [loadWaitingSites]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.store === "waiting") loadWaitingSites();
      }),
    [loadWaitingSites],
  );

  const site = sites[0] ?? null;
  const href =
    site && typeof window !== "undefined" ? `${window.location.origin}${site.urlPath}` : "";

  async function copyLink() {
    if (!href) return;
    try {
      await window.navigator.clipboard?.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <Button onClick={() => createWaitingSite(sessionId)}>
          {t.createWaitingLink}
        </Button>

        {site ? (
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase text-club-green">
                {t.waitingSiteUrl}
              </p>
              <p className="mt-1 break-all text-sm font-black">{href}</p>
            </div>
            <div className="grid aspect-square place-items-center rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span
                    className={`rounded-sm ${
                      [0, 1, 5, 6, 3, 4, 8, 9, 15, 16, 20, 21, 18, 22, 24, 12].includes(index)
                        ? "bg-club-black"
                        : "bg-slate-100"
                    }`}
                    key={index}
                  />
                ))}
              </div>
              <p className="sr-only">{t.qrPlaceholder}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="min-h-0 px-3 py-2"
                icon={<Copy size={16} />}
                onClick={copyLink}
                variant="secondary"
              >
                {copied ? t.copied : t.copyLink}
              </Button>
              <Button
                className="min-h-0 px-3 py-2"
                icon={<ExternalLink size={16} />}
                onClick={() => window.open(site.urlPath, "_blank")}
                variant="secondary"
              >
                {t.openWaitingSite}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ReservationManagementPanel({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadReservationSource = useReservationStore((state) => state.loadReservationSource);
  const source = useReservationStore((state) => state.sourcesBySession[sessionId]);
  const selectedPartyCardId = useReservationStore(
    (state) => state.selectedPartyCardIdBySession[sessionId],
  );
  const selectPartyCardForAssignment = useReservationStore(
    (state) => state.selectPartyCardForAssignment,
  );
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const rawPartyCards = useVisitStore((state) => state.partyCardsBySession[sessionId] ?? EMPTY_PARTY_CARDS);
  const toggleGuestCheckIn = useVisitStore((state) => state.toggleGuestCheckIn);
  const checkInAllGuests = useVisitStore((state) => state.checkInAllGuests);
  const updateOverdueReservations = useVisitStore((state) => state.updateOverdueReservations);
  const [expandedGuestIds, setExpandedGuestIds] = useState<string[]>([]);
  const partyCards = rawPartyCards;
  const reservationCards = partyCards
    .filter((card) => card.type === "reservation" && (!source || card.sourceId === source.id))
    .sort((a, b) => (a.reservationTime ?? "").localeCompare(b.reservationTime ?? ""));
  const waitingCards = partyCards
    .filter((card) => card.type === "waiting")
    .sort((a, b) => (a.waitingOrder ?? 0) - (b.waitingOrder ?? 0));
  const timelineItems = [
    ...reservationCards.map((card) => ({
      card,
      slot: card.reservationTime ?? "--:--",
    })),
    ...waitingCards.map((card, index) => ({
      card,
      slot: waitingSlot(index),
    })),
  ].sort((a, b) => a.slot.localeCompare(b.slot) || a.card.code.localeCompare(b.card.code));

  useEffect(() => {
    loadReservationSource(sessionId);
    loadVisits(sessionId);
    updateOverdueReservations(sessionId);
  }, [loadReservationSource, loadVisits, sessionId, updateOverdueReservations]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.sessionId && payload.sessionId !== sessionId) return;
        if (payload.store === "reservations") loadReservationSource(sessionId);
        if (payload.store === "visits") loadVisits(sessionId);
      }),
    [loadReservationSource, loadVisits, sessionId],
  );

  if (!source && waitingCards.length === 0) {
    return (
      <PlaceholderPanel>
        {t.reservationSourceEmpty}
      </PlaceholderPanel>
    );
  }

  const groups = timelineItems.reduce<Record<string, PartyCard[]>>((next, item) => {
    next[item.slot] = [...(next[item.slot] ?? []), item.card];
    return next;
  }, {});

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      {selectedPartyCardId ? (
        <div className="shrink-0 rounded-2xl border border-club-green bg-lime-50 p-3 text-sm font-black text-club-black">
          {t.selectedReservationCard}:{" "}
          {timelineItems.find((item) => item.card.id === selectedPartyCardId)?.card.code}
          <p className="mt-1 text-xs text-slate-600">{t.clickEmptyTableToAssign}</p>
        </div>
      ) : null}

      {timelineItems.length === 0 ? (
        <PlaceholderPanel>{t.noReservationsYet}</PlaceholderPanel>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-3">
            {Object.entries(groups).map(([time, cards]) => (
              <div className="grid gap-2" key={time}>
                <div className="sticky top-0 z-10 rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-club-green shadow-sm">
                  {time}
                </div>
                {cards.map((card) => {
                  const allChecked = card.guests.length > 0 && card.guests.every((guest) => guest.checkedIn);
                  const partialChecked = card.guests.some((guest) => guest.checkedIn) && !allChecked;
                  const selected = selectedPartyCardId === card.id;
                  const assignable = card.status === "waiting" || card.status === "overdue";

                  return (
                    <article
                      className={`rounded-2xl border p-3 shadow-sm transition ${
                        card.type === "waiting" && (card.status === "waiting" || card.status === "overdue")
                          ? "border-club-black bg-club-black text-white"
                          : card.status === "overdue"
                            ? "border-red-300 bg-red-50 text-club-ink"
                            : card.status === "seated" || card.status === "completed"
                              ? "border-slate-200 bg-slate-100 text-club-ink"
                              : allChecked
                                ? "border-purple-300 bg-purple-50 text-club-ink"
                                : "border-lime-300 bg-[#dfff4f] text-club-ink"
                      } ${partialChecked ? "ring-2 ring-club-green/40" : ""} ${
                        selected ? "ring-4 ring-club-green" : ""
                      }`}
                      key={card.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-black">{card.code}</p>
                          <p className="text-xs font-bold opacity-80">
                            {card.type === "waiting"
                              ? `${t.waitingOrder}: ${card.waitingOrder} · ${t.tableCount}: ${card.tableCount}`
                              : `${t.reservationTime}: ${card.reservationTime} · ${t.tableCount}: ${card.tableCount}`}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-club-ink">
                          {partyCardStatusText(card, allChecked, t)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {card.guests.map((guest) => {
                          const expanded = expandedGuestIds.includes(guest.id);
                          return (
                            <div className="rounded-xl bg-white/85 p-2 text-club-ink" key={guest.id}>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  className="text-left text-sm font-black"
                                  onClick={() =>
                                    setExpandedGuestIds((current) =>
                                      current.includes(guest.id)
                                        ? current.filter((id) => id !== guest.id)
                                        : [...current, guest.id],
                                    )
                                  }
                                  type="button"
                                >
                                  {guest.name}
                                </button>
                                <button
                                  aria-label={guest.checkedIn ? t.checkedIn : t.notCheckedIn}
                                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${
                                    guest.checkedIn
                                      ? "bg-club-green text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                  onClick={() => toggleGuestCheckIn(sessionId, card.id, guest.id)}
                                  title={guest.checkedIn ? t.checkedIn : t.notCheckedIn}
                                  type="button"
                                >
                                  <Check size={17} />
                                </button>
                              </div>
                              {expanded ? (
                                <div className="mt-2 text-xs font-bold text-slate-600">
                                  {guest.phone ? <p>{guest.phone}</p> : null}
                                  {guest.username ? <p>@{guest.username}</p> : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          className="min-h-0 px-3 py-2"
                          onClick={() => checkInAllGuests(sessionId, card.id)}
                          variant="secondary"
                        >
                          {t.checkAll}
                        </Button>
                        <Button
                          className="min-h-0 px-3 py-2"
                          disabled={!assignable}
                          onClick={() =>
                            selectPartyCardForAssignment(sessionId, selected ? null : card.id)
                          }
                        >
                          {t.assignToTable}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function HandyDevicePanel({ sessionId }: { sessionId: string }) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadHandyState = useHandyStore((state) => state.loadHandyState);
  const createActivationCode = useHandyStore((state) => state.createActivationCode);
  const kickDevice = useHandyStore((state) => state.kickDevice);
  const rawCodes = useHandyStore((state) => state.activationCodesBySession[sessionId]);
  const rawDevices = useHandyStore((state) => state.devicesBySession[sessionId]);
  const [latestCode, setLatestCode] = useState("");
  const [kickTarget, setKickTarget] = useState<StaffDevice | null>(null);
  const codes = Array.isArray(rawCodes) ? rawCodes : [];
  const devices = Array.isArray(rawDevices) ? rawDevices : [];
  const latestStoredCode = codes.length > 0 ? codes[codes.length - 1] : "";

  useEffect(() => {
    loadHandyState();
  }, [loadHandyState]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.store === "handy") loadHandyState();
      }),
    [loadHandyState],
  );

  const activeDevices = devices.filter((device) => device.status === "active");

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Button
        onClick={() => {
          const code = createActivationCode(sessionId);
          setLatestCode(code);
        }}
      >
        {t.createActivationCode}
      </Button>

      {latestCode || latestStoredCode ? (
        <div className="rounded-2xl bg-white p-4 text-center">
          <p className="text-xs font-black uppercase text-slate-500">{t.currentActivationCode}</p>
          <p className="mt-1 text-3xl font-black tracking-[0.18em]">
            {latestCode || latestStoredCode}
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-black">{t.connectedDevices}</h3>
        {activeDevices.length === 0 ? (
          <p className="rounded-xl bg-white p-3 text-sm font-bold text-slate-500">
            {t.noConnectedDevices}
          </p>
        ) : (
          <div className="grid gap-2">
            {activeDevices.map((device) => (
              <div className="rounded-xl bg-white p-3" key={device.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black">{device.staffName}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {t.connectedAt}: {formatDateTime(device.connectedAt)}
                    </p>
                    <p className="text-xs font-bold text-club-green">
                      {t.status}: {t.activeStatus}
                    </p>
                  </div>
                  <Button
                    className="min-h-0 px-3 py-2"
                    onClick={() => setKickTarget(device)}
                    variant="danger"
                  >
                    {t.kickDevice}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        onClose={() => setKickTarget(null)}
        open={Boolean(kickTarget)}
        title={t.removeDeviceTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.removeDevicePrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setKickTarget(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (kickTarget) kickDevice(sessionId, kickTarget.id);
                setKickTarget(null);
              }}
              variant="danger"
            >
              {t.kickDevice}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function waitingSlot(index: number) {
  const now = new Date();
  const minutes = now.getMinutes();
  const next = new Date(now);
  const roundedMinute = minutes === 0 || minutes <= 30 ? 30 : 60;
  next.setMinutes(roundedMinute, 0, 0);
  next.setTime(next.getTime() + index * 30 * 60_000);
  return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function partyCardStatusText(
  card: PartyCard,
  allChecked: boolean,
  t: ReturnType<typeof getDictionary>,
) {
  if (card.status === "overdue") return t.overdue;
  if (card.status === "seated") return t.seated;
  if (card.status === "completed") return t.completed;
  if (allChecked) return t.checkedIn;
  return t.notCheckedIn;
}

function PlaceholderPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-600">{children}</div>
    </section>
  );
}
