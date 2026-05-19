"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  FileJson,
  Hourglass,
  RefreshCcw,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { getApiBase } from "@/lib/api/client";
import type { AdminReservation } from "@/lib/api/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { mockClubXEvents } from "@/lib/mock/reservations";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import { useReservationStore } from "@/stores/useReservationStore";
import { useVisitStore } from "@/stores/useVisitStore";
import { useWaitingStore } from "@/stores/useWaitingStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useTableStore } from "@/stores/useTableStore";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import type { PartyCard, StaffDevice, Table, WaitingSite } from "@/types";
import type { SidebarTab } from "@/types";

const EMPTY_PARTY_CARDS: PartyCard[] = [];
const EMPTY_WAITING_SITES: WaitingSite[] = [];
const EMPTY_TABLES: Table[] = [];

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
  const syncPublicReservations = useReservationStore((state) => state.syncPublicReservations);
  const importPublicReservationsSnapshot = useReservationStore(
    (state) => state.importPublicReservationsSnapshot,
  );
  const source = useReservationStore((state) => state.sourcesBySession[sessionId]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [apiError, setApiError] = useState("");
  const [fileMessage, setFileMessage] = useState("");

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

  async function handlePublicSync() {
    setSyncing(true);
    setApiError("");
    setFileMessage("");
    try {
      await syncPublicReservations(sessionId);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Public reservation sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setApiError("");
    setFileMessage("");
    try {
      const text = await file.text();
      const reservations = file.name.toLowerCase().endsWith(".csv")
        ? parseReservationCsv(text)
        : parseReservationJson(text);
      importPublicReservationsSnapshot(sessionId, reservations);
      setFileMessage(`${reservations.length} reservations imported from local file.`);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "Failed to import reservation file.");
    }
  }

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void handlePublicSync();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, sessionId]);

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 rounded-2xl border border-club-green/30 bg-white p-4">
        <div>
          <p className="text-xs font-black uppercase text-club-green">ClubX reservation JSON</p>
          <p className="mt-1 break-all text-xs font-bold text-slate-500">{getApiBase()}</p>
        </div>
        <Button disabled={syncing} icon={<RefreshCcw size={17} />} onClick={handlePublicSync}>
          {syncing ? "불러오는 중..." : "ClubX 예약 JSON 불러오기"}
        </Button>
        <input
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={handleFileImport}
          ref={fileInputRef}
          type="file"
        />
        <Button
          icon={<FileJson size={17} />}
          onClick={() => fileInputRef.current?.click()}
          variant="secondary"
        >
          로컬 JSON/CSV 가져오기
        </Button>
        <label className="flex items-center gap-2 text-xs font-black text-slate-600">
          <input
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            type="checkbox"
          />
          10초 자동 새로고침
        </label>
        {source?.id === "public-pub-reservations" ? (
          <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
            <p>마지막 동기화: {formatDateTime(source.importedAt)}</p>
            <p>가져온 예약 수: {source.reservationCount}</p>
          </div>
        ) : null}
        {apiError || source?.errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {apiError || source?.errorMessage}
          </div>
        ) : null}
        {fileMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
            {fileMessage}
          </div>
        ) : null}
      </div>

      <Button onClick={() => setSearchOpen((value) => !value)} variant="secondary">
        {t.importFromClubX} (dev)
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
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const getMergeGroupByTableId = useTableStore((state) => state.getMergeGroupByTableId);
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
                  const inactiveUpstream = Boolean(
                    card.upstreamStatus &&
                      ["cancelled", "deleted", "hidden", "missing"].includes(card.upstreamStatus),
                  );
                  const assignable =
                    !inactiveUpstream && (card.status === "waiting" || card.status === "overdue");

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
                        <div className="grid justify-items-end gap-1">
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-club-ink">
                            {mappedTableLabel(card, tables, getMergeGroupByTableId, sessionId, t)}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-club-ink">
                            {partyCardStatusText(card, allChecked, t)}
                          </span>
                          {inactiveUpstream ? (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-700">
                              API {card.upstreamStatus}
                            </span>
                          ) : null}
                        </div>
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
                                  title={t.checkIn}
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
                          {t.checkInAll}
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
  const [deleteTarget, setDeleteTarget] = useState<StaffDevice | null>(null);
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
                    onClick={() => setDeleteTarget(device)}
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
        onClose={() => setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
        title={t.removeDeviceTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.removeDevicePrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setDeleteTarget(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (deleteTarget) kickDevice(sessionId, deleteTarget.id);
                setDeleteTarget(null);
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

function mappedTableLabel(
  card: PartyCard,
  tables: Array<{ id: string; number: string; mergedGroupId?: string }>,
  getMergeGroupByTableId: (sessionId: string, tableId: string) => { label: string } | undefined,
  sessionId: string,
  t: ReturnType<typeof getDictionary>,
) {
  const tableId = card.mappedTableIds?.[0];
  if (!tableId) return t.unassigned;
  const group = getMergeGroupByTableId(sessionId, tableId);
  if (group) return group.label;
  const table = tables.find((item) => item.id === tableId);
  return table ? (t.table === "Table" ? `Table ${table.number}` : `${table.number}번`) : t.unassigned;
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

function parseReservationJson(text: string): AdminReservation[] {
  const parsed = JSON.parse(text) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "data" in parsed
      ? (parsed as { data?: unknown }).data
      : typeof parsed === "object" && parsed !== null && "reservations" in parsed
        ? (parsed as { reservations?: unknown }).reservations
        : null;

  if (!Array.isArray(list)) {
    throw new Error("JSON must be an array or contain data/reservations array.");
  }

  return list.map((item, index) => normalizeImportedReservation(item, index));
}

function parseReservationCsv(text: string): AdminReservation[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""]));
    return normalizeImportedReservation(record, index);
  });
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeImportedReservation(raw: unknown, index: number): AdminReservation {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Invalid reservation row at index ${index + 1}.`);
  }
  const record = raw as Record<string, unknown>;
  const id = textField(record, "id") || textField(record, "reservation_id") || `local-${index + 1}`;
  const startLabel = textField(record, "start_label") || minuteToLabel(numberField(record, "start_minute"));
  const endLabel = textField(record, "end_label") || minuteToLabel(numberField(record, "end_minute"));
  const guests = parseImportedGuests(record, id);

  return {
    id,
    reservation_code:
      textField(record, "reservation_code") ||
      textField(record, "reservation_number") ||
      textField(record, "code") ||
      `LOCAL-${String(index + 1).padStart(3, "0")}`,
    status: textField(record, "status") || "confirmed",
    event_id: textField(record, "event_id") || "local-file",
    service_date: textField(record, "service_date") || new Date().toISOString().slice(0, 10),
    start_minute: numberField(record, "start_minute"),
    end_minute: numberField(record, "end_minute"),
    start_label: startLabel,
    end_label: endLabel,
    total_party_size: numberField(record, "total_party_size") || guests.length || 1,
    table_count: Math.max(1, numberField(record, "table_count") || 1),
    contact_name: textField(record, "contact_name") || guests[0]?.name || "-",
    contact_phone: textField(record, "contact_phone") || textField(record, "phone") || null,
    contact_phone_masked: textField(record, "contact_phone_masked") || null,
    created_at: textField(record, "created_at") || new Date().toISOString(),
    guests,
  };
}

function parseImportedGuests(record: Record<string, unknown>, reservationId: string) {
  if (Array.isArray(record.guests)) {
    return record.guests.map((guest, index) => {
      const item = typeof guest === "object" && guest !== null ? guest as Record<string, unknown> : {};
      return {
        id: textField(item, "id") || `${reservationId}:guest:${index}`,
        name: textField(item, "name") || `Guest ${index + 1}`,
        phone: textField(item, "phone") || null,
        phone_masked: textField(item, "phone_masked") || null,
        username: textField(item, "username") || textField(item, "clubx_username") || null,
      };
    });
  }

  const names = splitList(textField(record, "guest_names") || textField(record, "names"));
  const phones = splitList(textField(record, "guest_phones") || textField(record, "phones"));
  if (names.length) {
    return names.map((name, index) => ({
      id: `${reservationId}:guest:${index}`,
      name,
      phone: phones[index] ?? null,
      phone_masked: null,
    }));
  }

  const contactName = textField(record, "contact_name") || textField(record, "name");
  if (!contactName) return [];
  return [{
    id: `${reservationId}:contact`,
    name: contactName,
    phone: textField(record, "contact_phone") || textField(record, "phone") || null,
    phone_masked: textField(record, "contact_phone_masked") || null,
  }];
}

function textField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = Number(record[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function splitList(value: string) {
  return value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

function minuteToLabel(minute: number) {
  if (!minute) return "00:00";
  const hour = Math.floor(minute / 60);
  const min = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
