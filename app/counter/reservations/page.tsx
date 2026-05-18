"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  ListOrdered,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { api, ApiError } from "@/lib/api/client";
import {
  displayFullPhone,
  type AdminReservation,
  type AdminReservationListResponse,
} from "@/lib/api/types";
import { describeAdminApiError, formatKstDateTime } from "@/lib/utils/datetime";

type ViewMode = "byTime" | "recent";

type TimeFilter = "all" | "slot1" | "slot2" | "after21";

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-club-acid text-club-black",
  checked_in: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "예약 접수",
  checked_in: "입장 완료",
  cancelled: "취소됨",
};

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "slot1", label: "18:00 - 19:30" },
  { key: "slot2", label: "19:30 - 21:00" },
  { key: "after21", label: "21:00 이후" },
];

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-slate-200 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black tracking-wide ${cls}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function matchesTimeFilter(r: AdminReservation, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "slot1") return r.start_minute === 18 * 60 && r.end_minute === 19 * 60 + 30;
  if (filter === "slot2") return r.start_minute === 19 * 60 + 30 && r.end_minute === 21 * 60;
  if (filter === "after21") return r.start_minute >= 21 * 60;
  return true;
}

function ReservationRow({
  reservation,
  busy,
  onCancel,
  onDelete,
}: {
  reservation: AdminReservation;
  busy: boolean;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const canCancel = reservation.status !== "cancelled";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-club-ink">
              {reservation.reservation_code}
            </h3>
            <StatusBadge status={reservation.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {reservation.service_date} · {reservation.start_label} – {reservation.end_label}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            신청 시각
          </div>
          <div className="font-mono text-sm font-bold text-slate-700">
            {formatKstDateTime(reservation.created_at)}
          </div>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">예약자</dt>
          <dd className="font-black">{reservation.contact_name}</dd>
          <dd className="text-xs text-slate-600">
            {displayFullPhone(reservation.contact_phone, reservation.contact_phone_masked) || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">인원</dt>
          <dd className="font-black">{reservation.total_party_size}명</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">테이블</dt>
          <dd className="font-black">{reservation.table_count}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">ClubX / 외부</dt>
          <dd className="font-black">
            {reservation.clubx_count} / {reservation.non_clubx_count}
          </dd>
        </div>
      </dl>

      {reservation.guests.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
            동반자 ({reservation.guests.length})
          </summary>
          <ul className="mt-2 grid gap-1 text-sm">
            {reservation.guests.map((g, idx) => (
              <li
                className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5"
                key={`${reservation.id}-${idx}`}
              >
                <span className="font-bold">
                  {g.guest_type === "clubx"
                    ? `@${g.username ?? "?"}${g.display_name ? ` (${g.display_name})` : ""}`
                    : g.name ?? "—"}
                </span>
                <span className="text-xs text-slate-600">
                  {g.guest_type === "clubx" ? "ClubX" : displayFullPhone(g.phone, g.phone_masked)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          icon={<Trash2 size={16} />}
          variant="ghost"
          disabled={busy}
          onClick={() => onDelete(reservation.id)}
        >
          예약 내역 삭제
        </Button>
        <Button
          icon={<XCircle size={16} />}
          variant="danger"
          disabled={!canCancel || busy}
          onClick={() => onCancel(reservation.id)}
        >
          예약 취소
        </Button>
      </div>
    </article>
  );
}

type TimeGroup = {
  key: string;
  label: string;
  startMinute: number;
  endMinute: number;
  items: AdminReservation[];
};

function groupByTime(items: AdminReservation[]): TimeGroup[] {
  const map = new Map<string, TimeGroup>();
  for (const r of items) {
    const key = `${r.start_minute}-${r.end_minute}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        label: `${r.start_label} - ${r.end_label}`,
        startMinute: r.start_minute,
        endMinute: r.end_minute,
        items: [],
      };
      map.set(key, g);
    }
    g.items.push(r);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  for (const g of groups) {
    g.items.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return groups;
}

function GroupHeader({ group }: { group: TimeGroup }) {
  let submitted = 0;
  let cancelled = 0;
  let tables = 0;
  let party = 0;
  for (const r of group.items) {
    if (r.status === "cancelled") {
      cancelled += 1;
      continue;
    }
    submitted += 1;
    tables += r.table_count;
    party += r.total_party_size;
  }
  return (
    <header className="rounded-2xl bg-club-black px-4 py-3 text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black sm:text-xl">{group.label}</h2>
        <p className="text-sm font-bold text-club-acid">
          예약 {submitted}팀 · {party}명 · {tables}테이블
          {cancelled > 0 ? (
            <span className="ml-2 text-xs font-bold text-slate-300">
              (취소 {cancelled})
            </span>
          ) : null}
        </p>
      </div>
    </header>
  );
}

export default function CounterReservationsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminReservationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("byTime");

  const load = useCallback(
    async (overrides?: { search?: string; status?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const query: Record<string, string> = {};
        const s = overrides?.search ?? search;
        const st = overrides?.status ?? statusFilter;
        if (s.trim()) query.search = s.trim();
        if (st) query.status = st;
        const res = await api.get<AdminReservationListResponse>(
          "/admin/pub-reservations/reservations",
          query,
        );
        setData(res);
      } catch (err) {
        setError(describeAdminApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(id: string) {
    if (!window.confirm("이 예약을 취소하고 선예약 테이블 재고를 복구할까요?")) return;
    setBusyId(id);
    try {
      await api.post(`/admin/pub-reservations/reservations/${id}/cancel`, {
        release_tables: true,
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? describeAdminApiError(err) : "예약 취소에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "예약 내역을 삭제하시겠습니까? 이 작업은 운영 화면에서 숨겨집니다.",
      )
    )
      return;
    setBusyId(id);
    try {
      await api.post(`/admin/pub-reservations/reservations/${id}/hide`);
      await load();
    } catch (err) {
      alert(
        err instanceof ApiError
          ? describeAdminApiError(err)
          : "예약 내역 삭제에 실패했습니다.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((r) => matchesTimeFilter(r, timeFilter));
  }, [data, timeFilter]);

  const groups = useMemo(() => groupByTime(filteredItems), [filteredItems]);
  const recentItems = useMemo(
    () => [...filteredItems].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [filteredItems],
  );

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeft size={18} />}
            onClick={() => router.push("/counter/dashboard")}
            variant="secondary"
          >
            대시보드
          </Button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
              ClubX POS · Pub
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">공개 예약 관리</h1>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={() => load()}
          variant="secondary"
          disabled={loading}
        >
          {loading ? "새로고침 중..." : "새로고침"}
        </Button>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {/* View mode toggle */}
      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setViewMode("byTime")}
          className={`touch-target inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
            viewMode === "byTime"
              ? "bg-club-acid text-club-black"
              : "text-club-ink hover:bg-lime-50"
          }`}
        >
          <Clock size={16} /> 시간대별 보기
        </button>
        <button
          type="button"
          onClick={() => setViewMode("recent")}
          className={`touch-target inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
            viewMode === "recent"
              ? "bg-club-acid text-club-black"
              : "text-club-ink hover:bg-lime-50"
          }`}
        >
          <ListOrdered size={16} /> 최근순 보기
        </button>
      </section>

      {/* Time filters */}
      <section className="mb-4 flex flex-wrap gap-2">
        {TIME_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTimeFilter(f.key)}
            className={`touch-target rounded-full px-4 py-2 text-xs font-black tracking-wide ring-1 transition ${
              timeFilter === f.key
                ? "bg-club-ink text-white ring-club-ink"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* Search + status filter */}
      <section className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="검색"
            placeholder="예약 코드 또는 예약자명"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
            상태
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = e.target.value;
              setStatusFilter(next);
              load({ status: next });
            }}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-club-ink"
          >
            <option value="">전체</option>
            <option value="submitted">예약 접수</option>
            <option value="checked_in">입장 완료</option>
            <option value="cancelled">취소됨</option>
          </select>
        </label>
        <Button
          icon={<Search size={16} />}
          variant="secondary"
          onClick={() => load()}
          disabled={loading}
        >
          적용
        </Button>
      </section>

      {data && filteredItems.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          조건에 맞는 공개 예약이 없습니다.
        </div>
      ) : null}

      {viewMode === "byTime" ? (
        <section className="grid gap-5">
          {groups.map((g) => (
            <div className="grid gap-3" key={g.key}>
              <GroupHeader group={g} />
              <div className="grid gap-3">
                {g.items.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    busy={busyId === r.id}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="grid gap-3">
          {recentItems.map((r) => (
            <ReservationRow
              key={r.id}
              reservation={r}
              busy={busyId === r.id}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ))}
        </section>
      )}
    </AppShell>
  );
}
