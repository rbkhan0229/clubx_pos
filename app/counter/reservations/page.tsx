"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Plus, RefreshCcw, Search, Trash2, XCircle } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { api } from "@/lib/api/client";
import type { AdminReservation, AdminReservationListResponse } from "@/lib/api/types";
import { formatKstFullDateTime } from "@/lib/utils/datetime";

type ViewMode = "time" | "recent";
type StatusFilter = "all" | "active" | "cancelled" | "deleted";

export default function CounterReservationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("time");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReservations() {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get<AdminReservationListResponse>(
        "/admin/pub-reservations/reservations",
        { limit: 500 },
      );
      setReservations(normalizeReservationList(response));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReservations();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reservations
      .filter((reservation) => {
        const status = String(reservation.status).toLowerCase();
        if (statusFilter === "active" && ["cancelled", "deleted", "hidden"].includes(status)) return false;
        if (statusFilter === "cancelled" && status !== "cancelled") return false;
        if (statusFilter === "deleted" && !["deleted", "hidden"].includes(status)) return false;
        if (!normalizedQuery) return true;
        return (
          reservation.reservation_code.toLowerCase().includes(normalizedQuery) ||
          reservation.contact_name.toLowerCase().includes(normalizedQuery) ||
          reservation.guests.some((guest) => guest.name.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((a, b) =>
        viewMode === "recent"
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : a.start_minute - b.start_minute || b.created_at.localeCompare(a.created_at),
      );
  }, [query, reservations, statusFilter, viewMode]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, AdminReservation[]>>((next, reservation) => {
      const key = `${reservation.start_label}-${reservation.end_label}`;
      next[key] = [...(next[key] ?? []), reservation];
      return next;
    }, {});
  }, [filtered]);

  async function mutateReservation(action: () => Promise<unknown>) {
    setMessage("");
    try {
      await action();
      await loadReservations();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API request failed.");
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const groups = viewMode === "time" ? Object.entries(grouped) : [["최근순", filtered] as const];

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-club-lime">
            Public Reservations
          </p>
          <h1 className="mt-2 text-3xl font-black">공개 예약 원본 확인</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/counter/settings">
            <Button variant="secondary">설정</Button>
          </Link>
          <Link href="/counter/dashboard">
            <Button icon={<ArrowLeft size={18} />} variant="secondary">
              대시보드
            </Button>
          </Link>
        </div>
      </div>

      <section className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="touch-target w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-club-green"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이름 또는 예약코드 검색"
              value={query}
            />
          </label>
          <select
            className="touch-target rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            value={statusFilter}
          >
            <option value="all">전체 상태</option>
            <option value="active">활성 예약</option>
            <option value="cancelled">취소</option>
            <option value="deleted">삭제/숨김</option>
          </select>
          <select
            className="touch-target rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black"
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
            value={viewMode}
          >
            <option value="time">시간대별</option>
            <option value="recent">최근순</option>
          </select>
          <Button disabled={loading} icon={<RefreshCcw size={18} />} onClick={loadReservations}>
            {loading ? "불러오는 중" : "새로고침"}
          </Button>
        </div>
        {message ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {message}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4">
        {groups.map(([group, items]) => (
          <div className="grid gap-3" key={group}>
            <h2 className="rounded-2xl bg-club-black px-4 py-3 text-sm font-black text-white">
              {group} · {items.length}
            </h2>
            {items.map((reservation) => {
              const expanded = expandedIds.includes(reservation.id);
              const phone = reservation.contact_phone || reservation.contact_phone_masked || "-";
              return (
                <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" key={reservation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-black">{reservation.reservation_code}</p>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {reservation.contact_name} · {phone}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {reservation.start_label}-{reservation.end_label} · {reservation.total_party_size}명 · {reservation.table_count}테이블
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatKstFullDateTime(reservation.created_at)} KST
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {reservation.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="min-h-0 px-3 py-2" onClick={() => toggleExpanded(reservation.id)} variant="secondary">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      guests
                    </Button>
                    <Button
                      className="min-h-0 px-3 py-2"
                      icon={<Minus size={16} />}
                      onClick={() =>
                        mutateReservation(() =>
                          api.post(`/admin/pub-reservations/reservations/${reservation.id}/adjust-tables`, {
                            table_count: Math.max(1, reservation.table_count - 1),
                          }),
                        )
                      }
                      variant="secondary"
                    >
                      table
                    </Button>
                    <Button
                      className="min-h-0 px-3 py-2"
                      icon={<Plus size={16} />}
                      onClick={() =>
                        mutateReservation(() =>
                          api.post(`/admin/pub-reservations/reservations/${reservation.id}/adjust-tables`, {
                            table_count: reservation.table_count + 1,
                          }),
                        )
                      }
                      variant="secondary"
                    >
                      table
                    </Button>
                    <Button
                      className="min-h-0 px-3 py-2"
                      icon={<XCircle size={16} />}
                      onClick={() =>
                        mutateReservation(() =>
                          api.post(`/admin/pub-reservations/reservations/${reservation.id}/cancel`),
                        )
                      }
                      variant="danger"
                    >
                      예약 취소
                    </Button>
                    <Button
                      className="min-h-0 px-3 py-2"
                      icon={<Trash2 size={16} />}
                      onClick={() =>
                        mutateReservation(() =>
                          api.delete(`/admin/pub-reservations/reservations/${reservation.id}`),
                        )
                      }
                      variant="danger"
                    >
                      내역 삭제
                    </Button>
                  </div>

                  {expanded ? (
                    <div className="mt-4 grid gap-2">
                      {reservation.guests.map((guest, index) => (
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm font-bold" key={guest.id ?? index}>
                          {guest.name} · {guest.phone || guest.phone_masked || "-"}
                          {guest.username || guest.clubx_username ? (
                            <span className="ml-2 text-club-green">@{guest.username || guest.clubx_username}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function normalizeReservationList(response: AdminReservationListResponse | AdminReservation[]) {
  if (Array.isArray(response)) return response;
  return response.data ?? response.items ?? response.reservations ?? [];
}
