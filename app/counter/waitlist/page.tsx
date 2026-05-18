"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  LogOut,
  PhoneOff,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { WaitlistOperationCard } from "@/components/admin/WaitlistOperationCard";
import { api, ApiError } from "@/lib/api/client";
import {
  displayFullPhone,
  type AdminWaitlistCallNextResponse,
  type AdminWaitlistEntry,
  type AdminWaitlistListResponse,
  type AdminWaitlistOverview,
} from "@/lib/api/types";

const STATUS_BADGE: Record<string, string> = {
  waiting: "bg-club-acid text-club-black",
  called: "bg-amber-100 text-amber-800",
  seated: "bg-emerald-100 text-emerald-800",
  no_show: "bg-slate-200 text-slate-600",
  cancelled: "bg-slate-200 text-slate-600",
  left: "bg-slate-200 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "대기 중",
  called: "호출됨",
  seated: "착석",
  no_show: "노쇼",
  cancelled: "취소됨",
  left: "퇴장",
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

function OverviewPanel({
  overview,
  onCallNext,
  callNextBusy,
}: {
  overview: AdminWaitlistOverview | null;
  onCallNext: () => void;
  callNextBusy: boolean;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
            현장 수용 현황
          </p>
          <h2 className="text-xl font-black sm:text-2xl">10테이블 한도</h2>
        </div>
        <Button
          icon={<PlayCircle size={18} />}
          onClick={onCallNext}
          disabled={callNextBusy || !overview || overview.available_tables <= 0}
        >
          {callNextBusy ? "호출 중..." : "다음 팀 호출"}
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="한도"
          value={overview ? overview.walkin_table_quota : "—"}
        />
        <Stat
          label="사용 중"
          value={overview ? overview.occupied_tables : "—"}
          tone="warn"
        />
        <Stat
          label="가용"
          value={overview ? overview.available_tables : "—"}
          tone="good"
        />
        <Stat
          label="현재 호출 번호"
          value={overview ? overview.current_called_number : "—"}
        />
        <Stat
          label="대기"
          value={overview ? overview.waiting_count : "—"}
        />
        <Stat label="호출" value={overview ? overview.called_count : "—"} />
        <Stat label="착석" value={overview ? overview.seated_count : "—"} />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn";
}) {
  const colour =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-club-ink";
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-black ${colour}`}>{value}</dd>
    </div>
  );
}

function WaitlistRow({
  entry,
  busy,
  onAction,
}: {
  entry: AdminWaitlistEntry;
  busy: boolean;
  onAction: (action: WaitlistAction, entry: AdminWaitlistEntry) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-club-black px-3 py-1 text-lg font-black text-club-acid">
              #{entry.queue_number}
            </span>
            <h3 className="text-lg font-black text-club-ink">
              {entry.waiting_code}
            </h3>
            <StatusBadge status={entry.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {entry.preferred_start_label && entry.preferred_end_label
              ? `${entry.preferred_start_label} – ${entry.preferred_end_label}`
              : "희망 시간 없음"}
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          {formatDate(entry.created_at)}
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">이름</dt>
          <dd className="font-black">{entry.name}</dd>
          <dd className="text-xs text-slate-600">{displayFullPhone(entry.phone, entry.phone_masked)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">인원</dt>
          <dd className="font-black">{entry.party_size}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">테이블</dt>
          <dd className="font-black">{entry.required_tables}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">
            호출 / 착석
          </dt>
          <dd className="font-black text-xs">
            {entry.called_at ? formatDate(entry.called_at) : "—"}
          </dd>
          <dd className="font-black text-xs">
            {entry.seated_at ? formatDate(entry.seated_at) : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {entry.status === "waiting" && (
          <Button
            icon={<BellRing size={16} />}
            onClick={() => onAction("call", entry)}
            disabled={busy}
          >
            호출
          </Button>
        )}
        {entry.status === "called" && (
          <>
            <Button
              icon={<CheckCircle2 size={16} />}
              onClick={() => onAction("seat", entry)}
              disabled={busy}
            >
              착석 처리
            </Button>
            <Button
              icon={<PhoneOff size={16} />}
              variant="secondary"
              onClick={() => onAction("no_show", entry)}
              disabled={busy}
            >
              노쇼
            </Button>
            <Button
              icon={<XCircle size={16} />}
              variant="danger"
              onClick={() => onAction("cancel", entry)}
              disabled={busy}
            >
              취소
            </Button>
          </>
        )}
        {entry.status === "seated" && (
          <Button
            icon={<LogOut size={16} />}
            variant="secondary"
            onClick={() => onAction("leave", entry)}
            disabled={busy}
          >
            퇴장 처리
          </Button>
        )}
      </div>
    </article>
  );
}

type WaitlistAction = "call" | "seat" | "no_show" | "cancel" | "leave";

const ACTION_PATH: Record<WaitlistAction, string> = {
  call: "call",
  seat: "seat",
  no_show: "no-show",
  cancel: "cancel",
  leave: "leave",
};

const ACTION_CONFIRM: Record<WaitlistAction, string> = {
  call: "이 팀을 지금 호출할까요?",
  seat: "이 팀을 착석 처리할까요?",
  no_show: "이 팀을 노쇼 처리할까요?",
  cancel: "이 대기 항목을 취소할까요?",
  leave: "이 팀을 퇴장 처리하고 테이블을 비울까요?",
};

export default function CounterWaitlistPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminWaitlistOverview | null>(null);
  const [list, setList] = useState<AdminWaitlistListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [callNextBusy, setCallNextBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, ls] = await Promise.all([
        api.get<AdminWaitlistOverview>(
          "/admin/pub-reservations/waitlist/overview",
        ),
        api.get<AdminWaitlistListResponse>(
          "/admin/pub-reservations/waitlist",
        ),
      ]);
      setOverview(ov);
      setList(ls);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "대기열을 불러오지 못했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action: WaitlistAction, entry: AdminWaitlistEntry) {
    if (!window.confirm(ACTION_CONFIRM[action])) return;
    setBusyId(entry.id);
    try {
      await api.post(
        `/admin/pub-reservations/waitlist/${entry.id}/${ACTION_PATH[action]}`,
      );
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "처리에 실패했습니다.";
      alert(message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCallNext() {
    setCallNextBusy(true);
    try {
      const res = await api.post<AdminWaitlistCallNextResponse>(
        "/admin/pub-reservations/waitlist/call-next",
        {},
      );
      if (res.called.length === 0) {
        alert("현재 가용 테이블에 맞는 대기 팀이 없습니다.");
      }
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "다음 팀 호출에 실패했습니다.";
      alert(message);
    } finally {
      setCallNextBusy(false);
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
              ClubX POS · 현장 대기
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">현장 대기 관리</h1>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={load}
          variant="secondary"
          disabled={loading}
        >
          {loading ? "새로고침 중..." : "새로고침"}
        </Button>
      </header>

      <section className="mb-5">
        <WaitlistOperationCard
          initialState={
            overview
              ? {
                  waitlist_open: !!overview.waitlist_open,
                  waitlist_opened_at: overview.waitlist_opened_at,
                  waitlist_closed_at: overview.waitlist_closed_at,
                }
              : null
          }
          onChange={() => load()}
        />
      </section>

      <OverviewPanel
        overview={overview}
        onCallNext={handleCallNext}
        callNextBusy={callNextBusy}
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {list && list.items.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          아직 현장 대기 항목이 없습니다.
        </div>
      ) : null}

      <section className="grid gap-3">
        {list?.items.map((e) => (
          <WaitlistRow
            key={e.id}
            entry={e}
            busy={busyId === e.id}
            onAction={handleAction}
          />
        ))}
      </section>
    </AppShell>
  );
}
