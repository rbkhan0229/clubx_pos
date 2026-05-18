"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, XCircle } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { api, ApiError } from "@/lib/api/client";
import {
  displayPhone,
  type AdminReservation,
  type AdminReservationListResponse,
} from "@/lib/api/types";

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ReservationRow({
  reservation,
  busy,
  onCancel,
}: {
  reservation: AdminReservation;
  busy: boolean;
  onCancel: (id: string) => void;
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
            {reservation.service_date} · {reservation.start_label} –{" "}
            {reservation.end_label}
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          {formatDate(reservation.created_at)}
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">예약자</dt>
          <dd className="font-black">{reservation.contact_name}</dd>
          <dd className="text-xs text-slate-600">
            {displayPhone(reservation.contact_phone_masked) || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">인원</dt>
          <dd className="font-black">{reservation.total_party_size}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">테이블</dt>
          <dd className="font-black">{reservation.table_count}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">
            ClubX / 외부
          </dt>
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
                  {g.guest_type === "clubx" ? "ClubX" : displayPhone(g.phone_masked)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-4 flex justify-end">
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

export default function CounterReservationsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminReservationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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
        const message =
          err instanceof ApiError ? err.message : "예약 목록을 불러오지 못했습니다.";
        setError(message);
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
    if (
      !window.confirm(
        "이 예약을 취소하고 선예약 테이블 재고를 복구할까요?",
      )
    )
      return;
    setBusyId(id);
    try {
      await api.post(`/admin/pub-reservations/reservations/${id}/cancel`, {
        release_tables: true,
      });
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "예약 취소에 실패했습니다.";
      alert(message);
    } finally {
      setBusyId(null);
    }
  }

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
            <h1 className="text-2xl font-black sm:text-3xl">
              공개 예약 관리
            </h1>
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
        <Button variant="secondary" onClick={() => load()} disabled={loading}>
          적용
        </Button>
      </section>

      {data && data.items.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          아직 공개 예약이 없습니다.
        </div>
      ) : null}

      <section className="grid gap-3">
        {data?.items.map((r) => (
          <ReservationRow
            key={r.id}
            reservation={r}
            busy={busyId === r.id}
            onCancel={handleCancel}
          />
        ))}
      </section>
    </AppShell>
  );
}
