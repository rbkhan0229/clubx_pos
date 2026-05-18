"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  Clock3,
  DatabaseZap,
  KeyRound,
  LinkIcon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import {
  api,
  ApiError,
  apiFetch,
  getApiBase,
} from "@/lib/api/client";
import type {
  AdminReservation,
  AdminReservationListResponse,
  AdminWaitlistEntry,
  AdminWaitlistListResponse,
  AdminWaitlistOverview,
} from "@/lib/api/types";
import { formatKstDateTime } from "@/lib/utils/datetime";

type PublicConfigResponse = {
  event_id: string | null;
  service_date: string | null;
  slot_interval_minutes: number;
  min_booking_minutes: number;
  max_booking_minutes: number;
  terms_version: string;
};

type LoadError = {
  title: string;
  message: string;
};

function describeError(err: unknown): LoadError {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return {
        title: "운영 API 접근이 거부되었습니다.",
        message: "백엔드 배포가 최신인지, POS 운영 API가 무토큰 모드로 열려 있는지 확인하세요.",
      };
    }
    if (err.status === 0) {
      return {
        title: "ClubX 백엔드에 연결할 수 없습니다.",
        message: "CORS 설정과 NEXT_PUBLIC_CLUBX_API_BASE 값을 확인하세요.",
      };
    }
    return {
      title: `요청에 실패했습니다. (${err.status})`,
      message: err.message,
    };
  }
  return {
    title: "요청에 실패했습니다.",
    message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
  };
}

function timeRange(reservation: AdminReservation): string {
  return `${reservation.start_label} – ${reservation.end_label}`;
}

function preferredTime(entry: AdminWaitlistEntry): string {
  if (entry.preferred_start_label && entry.preferred_end_label) {
    return `${entry.preferred_start_label} – ${entry.preferred_end_label}`;
  }
  return "희망 시간 없음";
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "예약 접수",
  checked_in: "입장 완료",
  cancelled: "취소됨",
  waiting: "대기 중",
  called: "호출됨",
  seated: "착석",
  no_show: "노쇼",
  left: "퇴장",
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "submitted" || status === "waiting"
      ? "bg-club-acid text-club-black"
      : status === "called"
        ? "bg-amber-100 text-amber-800"
        : status === "seated" || status === "checked_in"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-600";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black tracking-wide ${tone}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-club-ink";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-2 text-2xl font-black sm:text-3xl ${valueTone}`}>
        {value}
      </dd>
      {helper ? (
        <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const iconTone =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700"
        : tone === "danger"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`rounded-2xl p-3 ${iconTone}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate text-base font-black text-club-ink">
            {value}
          </p>
          {helper ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ error }: { error: LoadError }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-black">{error.title}</p>
      <p className="mt-1 font-semibold">{error.message}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
      {children}
    </div>
  );
}

export default function CounterAdminPage() {
  const router = useRouter();
  const [apiBase, setApiBase] = useState("");
  const [connection, setConnection] = useState<"idle" | "ok" | "failed">(
    "idle",
  );
  const [config, setConfig] = useState<PublicConfigResponse | null>(null);
  const [reservations, setReservations] =
    useState<AdminReservationListResponse | null>(null);
  const [waitlist, setWaitlist] =
    useState<AdminWaitlistListResponse | null>(null);
  const [overview, setOverview] = useState<AdminWaitlistOverview | null>(null);
  const [connectionError, setConnectionError] = useState<LoadError | null>(null);
  const [adminError, setAdminError] = useState<LoadError | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const reservationSummary = useMemo(() => {
    const items = reservations?.items ?? [];
    return {
      total: reservations?.total ?? items.length,
      submitted: items.filter((item) => item.status === "submitted").length,
      cancelled: items.filter((item) => item.status === "cancelled").length,
      partySize: items.reduce((sum, item) => sum + item.total_party_size, 0),
      tables: items
        .filter((item) => item.status !== "cancelled")
        .reduce((sum, item) => sum + item.table_count, 0),
    };
  }, [reservations]);

  const recentReservations = useMemo(() => {
    return [...(reservations?.items ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
  }, [reservations]);

  const recentWaitlist = useMemo(() => {
    return [...(waitlist?.items ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
  }, [waitlist]);

  const timeGroupSummaries = useMemo(() => {
    const items = reservations?.items ?? [];
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        startMinute: number;
        endMinute: number;
        submitted: number;
        cancelled: number;
        party: number;
        tables: number;
      }
    >();
    for (const r of items) {
      const key = `${r.start_minute}-${r.end_minute}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          label: `${r.start_label} - ${r.end_label}`,
          startMinute: r.start_minute,
          endMinute: r.end_minute,
          submitted: 0,
          cancelled: 0,
          party: 0,
          tables: 0,
        };
        map.set(key, g);
      }
      if (r.status === "cancelled") {
        g.cancelled += 1;
      } else {
        g.submitted += 1;
        g.party += r.total_party_size;
        g.tables += r.table_count;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.startMinute - b.startMinute || a.endMinute - b.endMinute,
    );
  }, [reservations]);

  const loadConnection = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError(null);
    try {
      const res = await apiFetch<PublicConfigResponse>(
        "/public/pub-reservations/config",
        { anonymous: true },
      );
      setConfig(res);
      setConnection("ok");
    } catch (err) {
      setConfig(null);
      setConnection("failed");
      setConnectionError(describeError(err));
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const [reservationRes, overviewRes, waitlistRes] = await Promise.all([
        api.get<AdminReservationListResponse>(
          "/admin/pub-reservations/reservations",
        ),
        api.get<AdminWaitlistOverview>(
          "/admin/pub-reservations/waitlist/overview",
        ),
        api.get<AdminWaitlistListResponse>(
          "/admin/pub-reservations/waitlist",
        ),
      ]);
      setReservations(reservationRes);
      setOverview(overviewRes);
      setWaitlist(waitlistRes);
    } catch (err) {
      setAdminError(describeError(err));
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setApiBase(getApiBase() || "설정되지 않음");
    await Promise.all([loadConnection(), loadAdminData()]);
    setLastRefreshed(new Date().toLocaleTimeString());
  }, [loadAdminData, loadConnection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeft size={18} />}
            onClick={() => router.push("/counter/dashboard")}
            variant="secondary"
          >
            POS 대시보드
          </Button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
              ClubX POS · 운영
            </p>
            <h1 className="text-2xl font-black sm:text-4xl">
              펍 운영 대시보드
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              공개 예약과 현장 대기열 운영 상태를 한 화면에서 확인합니다
            </p>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={refresh}
          variant="secondary"
          disabled={connectionLoading || adminLoading}
        >
          {connectionLoading || adminLoading ? "새로고침 중..." : "새로고침"}
        </Button>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={<LinkIcon size={20} />}
          label="API 주소"
          value={apiBase || "설정되지 않음"}
          helper={config?.service_date ? `운영일 ${config.service_date}` : undefined}
          tone={apiBase ? "default" : "danger"}
        />
        <StatusCard
          icon={<ShieldCheck size={20} />}
          label="운영 접근"
          value="토큰 불필요"
          helper="POS 운영 화면에서 바로 조회/처리합니다"
          tone="good"
        />
        <StatusCard
          icon={<DatabaseZap size={20} />}
          label="백엔드 연결"
          value={
            connectionLoading
              ? "확인 중..."
              : connection === "ok"
                ? "정상"
                : connection === "failed"
                  ? "실패"
                  : "미확인"
          }
          helper={
            config
              ? `${config.slot_interval_minutes}분 단위 · 최대 ${config.max_booking_minutes}분`
              : undefined
          }
          tone={connection === "ok" ? "good" : connection === "failed" ? "danger" : "default"}
        />
        <StatusCard
          icon={<Clock3 size={20} />}
          label="마지막 새로고침"
          value={lastRefreshed ?? "—"}
          helper="운영자가 필요할 때 직접 최신 상태를 불러옵니다"
        />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
                예약
              </p>
              <h2 className="text-xl font-black">공개 예약 요약</h2>
            </div>
            {adminLoading ? (
              <span className="text-xs font-black uppercase text-slate-500">
                불러오는 중...
              </span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="전체 예약" value={reservationSummary.total} />
            <MetricCard
              label="유효 예약"
              value={reservationSummary.submitted}
              tone="good"
            />
            <MetricCard
              label="취소"
              value={reservationSummary.cancelled}
              tone={reservationSummary.cancelled ? "warn" : "default"}
            />
            <MetricCard label="총 인원" value={reservationSummary.partySize} />
            <MetricCard
              label="예약 테이블"
              value={reservationSummary.tables}
              tone="good"
            />
          </dl>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
                현장 대기
              </p>
              <h2 className="text-xl font-black">현장 10테이블 수용 현황</h2>
            </div>
            {adminLoading ? (
              <span className="text-xs font-black uppercase text-slate-500">
                불러오는 중...
              </span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="현장 테이블 한도" value={overview?.walkin_table_quota ?? "—"} />
            <MetricCard
              label="사용 중 테이블"
              value={overview?.occupied_tables ?? "—"}
              tone="warn"
            />
            <MetricCard
              label="가용 테이블"
              value={overview?.available_tables ?? "—"}
              tone="good"
            />
            <MetricCard label="대기 수" value={overview?.waiting_count ?? "—"} />
            <MetricCard label="호출 수" value={overview?.called_count ?? "—"} />
            <MetricCard label="착석 수" value={overview?.seated_count ?? "—"} />
            <MetricCard
              label="현재 호출 번호"
              value={overview?.current_called_number ?? "—"}
            />
          </dl>
        </div>
      </section>

      {(connectionError || adminError) ? (
        <section className="mb-5 grid gap-3 lg:grid-cols-2">
          {connectionError ? <ErrorCard error={connectionError} /> : null}
          {adminError ? <ErrorCard error={adminError} /> : null}
        </section>
      ) : null}

      <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-black">시간대별 예약 현황</h2>
          <Button
            icon={<CalendarCheck2 size={16} />}
            onClick={() => router.push("/counter/reservations")}
            variant="ghost"
          >
            전체 보기
          </Button>
        </div>
        {timeGroupSummaries.length === 0 ? (
          <EmptyState>
            {adminLoading
              ? "예약을 불러오는 중..."
              : "불러온 예약이 없습니다."}
          </EmptyState>
        ) : (
          <div className="grid gap-2">
            {timeGroupSummaries.map((g) => (
              <div
                key={g.key}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="text-base font-black text-club-ink">
                  {g.label}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  예약 {g.submitted}팀 · {g.party}명 · {g.tables}테이블
                  {g.cancelled > 0 ? (
                    <span className="ml-2 text-xs font-bold text-slate-400">
                      (취소 {g.cancelled})
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">최근 예약</h2>
            <Button
              icon={<CalendarCheck2 size={16} />}
              onClick={() => router.push("/counter/reservations")}
              variant="ghost"
            >
              전체 보기
            </Button>
          </div>
          {recentReservations.length ? (
            <div className="grid gap-2">
              {recentReservations.map((reservation) => (
                <article
                  className="rounded-2xl bg-slate-50 p-3"
                  key={reservation.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-club-ink">
                      {reservation.reservation_code}
                    </p>
                    <StatusPill status={reservation.status} />
                  </div>
                  <div className="mt-2 grid gap-1 text-sm font-semibold text-slate-600 sm:grid-cols-4">
                    <span>{timeRange(reservation)}</span>
                    <span>{reservation.contact_name}</span>
                    <span>인원 {reservation.total_party_size}</span>
                    <span>테이블 {reservation.table_count}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    신청 시각 {formatKstDateTime(reservation.created_at)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>
              {adminLoading ? "예약을 불러오는 중..." : "불러온 예약이 없습니다."}
            </EmptyState>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">최근 현장 대기</h2>
            <Button
              icon={<Users size={16} />}
              onClick={() => router.push("/counter/waitlist")}
              variant="ghost"
            >
              전체 보기
            </Button>
          </div>
          {recentWaitlist.length ? (
            <div className="grid gap-2">
              {recentWaitlist.map((entry) => (
                <article className="rounded-2xl bg-slate-50 p-3" key={entry.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-club-black px-2.5 py-1 text-sm font-black text-club-acid">
                        #{entry.queue_number}
                      </span>
                      <p className="font-black text-club-ink">
                        {entry.waiting_code}
                      </p>
                    </div>
                    <StatusPill status={entry.status} />
                  </div>
                  <div className="mt-2 grid gap-1 text-sm font-semibold text-slate-600 sm:grid-cols-4">
                    <span>{entry.name}</span>
                    <span>{preferredTime(entry)}</span>
                    <span>인원 {entry.party_size}</span>
                    <span>테이블 {entry.required_tables}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    신청 시각 {formatKstDateTime(entry.created_at)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>
              {adminLoading ? "대기열을 불러오는 중..." : "불러온 대기 항목이 없습니다."}
            </EmptyState>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">빠른 이동</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            icon={<CalendarCheck2 size={18} />}
            onClick={() => router.push("/counter/reservations")}
            variant="secondary"
          >
            공개 예약
          </Button>
          <Button
            icon={<Users size={18} />}
            onClick={() => router.push("/counter/waitlist")}
            variant="secondary"
          >
            현장 대기
          </Button>
          <Button
            icon={<KeyRound size={18} />}
            onClick={() => router.push("/counter/settings")}
            variant="secondary"
          >
            설정
          </Button>
          <Button
            icon={<RefreshCw size={18} />}
            onClick={refresh}
            disabled={connectionLoading || adminLoading}
          >
            새로고침
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
