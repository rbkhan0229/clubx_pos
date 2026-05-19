"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ, CalendarClock, LogOut, Plus, Settings } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import type { BusinessSession, SortKey } from "@/types";

function sortValue(session: BusinessSession, sortKey: SortKey) {
  if (sortKey === "lastAccessedAt") return session.lastAccessedAt ?? "";
  return session[sortKey];
}

export function DashboardClient() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const language = useAppStore((state) => state.language);
  const sessions = useAppStore((state) => state.sessions);
  const sortKey = useAppStore((state) => state.sortKey);
  const sortDirection = useAppStore((state) => state.sortDirection);
  const setSort = useAppStore((state) => state.setSort);
  const toggleSortDirection = useAppStore((state) => state.toggleSortDirection);
  const addSession = useAppStore((state) => state.addSession);
  const clearMockLogin = useAppStore((state) => state.clearMockLogin);
  const touchSession = useAppStore((state) => state.touchSession);
  const t = getDictionary(language);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aValue = sortValue(a, sortKey);
      const bValue = sortValue(b, sortKey);
      const result = String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? result : -result;
    });
  }, [sessions, sortDirection, sortKey]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("sessionName") ?? "").trim();
    if (!name) return;

    addSession(name);
    setModalOpen(false);
    event.currentTarget.reset();
  }

  function openSession(id: string) {
    touchSession(id);
    router.push(`/counter/session/${id}`);
  }

  function handleLogout() {
    clearMockLogin();
    setLogoutOpen(false);
    router.push("/login");
  }

  return (
    <AppShell>
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-club-lime">
            ClubX POS
          </p>
          <h1 className="text-3xl font-black sm:text-5xl">{t.dashboard}</h1>
          <p className="mt-3 max-w-2xl text-base font-semibold text-slate-600">
            {t.dashboardSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            icon={<Settings size={18} />}
            onClick={() => router.push("/counter/settings")}
            variant="secondary"
          >
            설정
          </Button>
          <Button
            icon={<CalendarClock size={18} />}
            onClick={() => router.push("/counter/reservations")}
            variant="secondary"
          >
            예약 확인
          </Button>
          <Button icon={<Plus size={19} />} onClick={() => setModalOpen(true)}>
            {t.createSession}
          </Button>
          <Button
            icon={<LogOut size={18} />}
            onClick={() => setLogoutOpen(true)}
            variant="secondary"
          >
            {t.logout}
          </Button>
        </div>
      </section>

      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <span className="text-sm font-black text-slate-600">{t.sortBy}</span>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[
            ["name", t.name],
            ["createdAt", t.createdDate],
            ["lastAccessedAt", t.lastAccessed],
          ].map(([key, label]) => (
            <button
              className={`touch-target rounded-xl px-3 py-2 text-sm font-black transition ${
                sortKey === key
                  ? "bg-club-acid text-club-black"
                  : "bg-white text-club-ink ring-1 ring-slate-200 hover:bg-lime-50"
              }`}
              key={key}
              onClick={() => setSort(key as SortKey)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          icon={sortDirection === "asc" ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
          onClick={toggleSortDirection}
          variant="secondary"
        >
          {sortDirection === "asc" ? t.ascending : t.descending}
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedSessions.map((session) => (
          <SessionCard key={session.id} onOpen={openSession} session={session} />
        ))}
      </section>

      <Modal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={t.createSession}
      >
        <form className="grid gap-4" onSubmit={handleCreate}>
          <Input
            autoFocus
            label={t.sessionName}
            name="sessionName"
            placeholder="Festival Night 1"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button type="submit">{t.create}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        onClose={() => setLogoutOpen(false)}
        open={logoutOpen}
        title={t.logoutTitle}
      >
        <div className="grid gap-5">
          <p className="text-sm font-semibold text-slate-600">{t.logoutMessage}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setLogoutOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button icon={<LogOut size={18} />} onClick={handleLogout} variant="danger">
              {t.confirmLogout}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
