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
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import {
  api,
  ApiError,
  apiFetch,
  getAdminToken,
  getApiBase,
} from "@/lib/api/client";
import type {
  AdminReservation,
  AdminReservationListResponse,
  AdminWaitlistEntry,
  AdminWaitlistListResponse,
  AdminWaitlistOverview,
} from "@/lib/api/types";

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
        title: "Admin token is invalid or expired.",
        message: "Go to Settings and paste a valid backend admin token.",
      };
    }
    if (err.status === 0) {
      return {
        title: "Cannot reach ClubX backend.",
        message: "Check CORS and NEXT_PUBLIC_CLUBX_API_BASE.",
      };
    }
    return {
      title: `Request failed (${err.status}).`,
      message: err.message,
    };
  }
  return {
    title: "Request failed.",
    message: err instanceof Error ? err.message : "Unexpected error.",
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function timeRange(reservation: AdminReservation): string {
  return `${reservation.start_label} – ${reservation.end_label}`;
}

function preferredTime(entry: AdminWaitlistEntry): string {
  if (entry.preferred_start_label && entry.preferred_end_label) {
    return `${entry.preferred_start_label} – ${entry.preferred_end_label}`;
  }
  return "No preference";
}

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
      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${tone}`}
    >
      {status}
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
  const [hasToken, setHasToken] = useState(false);
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
      .sort((a, b) => a.queue_number - b.queue_number)
      .slice(0, 5);
  }, [waitlist]);

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
    const token = getAdminToken();
    setHasToken(Boolean(token));
    if (!token) {
      setReservations(null);
      setWaitlist(null);
      setOverview(null);
      setAdminError({
        title: "Admin token is missing.",
        message: "Go to Settings and paste an admin token.",
      });
      return;
    }

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
    setApiBase(getApiBase() || "(not configured)");
    setHasToken(Boolean(getAdminToken()));
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
            POS dashboard
          </Button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
              ClubX POS · Operator
            </p>
            <h1 className="text-2xl font-black sm:text-4xl">
              Pub Admin Dashboard
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Public reservations and walk-in queue operation
            </p>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={refresh}
          variant="secondary"
          disabled={connectionLoading || adminLoading}
        >
          {connectionLoading || adminLoading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={<LinkIcon size={20} />}
          label="API Base"
          value={apiBase || "(not configured)"}
          helper={config?.service_date ? `Service date ${config.service_date}` : undefined}
          tone={apiBase ? "default" : "danger"}
        />
        <StatusCard
          icon={hasToken ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          label="Admin Token"
          value={hasToken ? "Saved" : "Missing"}
          helper="Stored in localStorage: clubx_admin_token"
          tone={hasToken ? "good" : "warn"}
        />
        <StatusCard
          icon={<DatabaseZap size={20} />}
          label="Backend Connection"
          value={
            connectionLoading
              ? "Checking…"
              : connection === "ok"
                ? "OK"
                : connection === "failed"
                  ? "Failed"
                  : "Not checked"
          }
          helper={
            config
              ? `${config.slot_interval_minutes}min slots · max ${config.max_booking_minutes}min`
              : undefined
          }
          tone={connection === "ok" ? "good" : connection === "failed" ? "danger" : "default"}
        />
        <StatusCard
          icon={<Clock3 size={20} />}
          label="Last Refreshed"
          value={lastRefreshed ?? "—"}
          helper="Manual refresh keeps operators in control"
        />
      </section>

      {!hasToken ? (
        <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-amber-900">
                Admin token is missing. Go to Settings and paste an admin token.
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                Backend connectivity can be checked anonymously, but reservation
                and waitlist data require an admin bearer token.
              </p>
            </div>
            <Button
              icon={<Settings size={18} />}
              onClick={() => router.push("/counter/settings")}
              variant="secondary"
            >
              Open Settings
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
                Reservations
              </p>
              <h2 className="text-xl font-black">Public reservation summary</h2>
            </div>
            {adminLoading ? (
              <span className="text-xs font-black uppercase text-slate-500">
                Loading…
              </span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total Reservations" value={reservationSummary.total} />
            <MetricCard
              label="Active Reservations"
              value={reservationSummary.submitted}
              tone="good"
            />
            <MetricCard
              label="Cancelled"
              value={reservationSummary.cancelled}
              tone={reservationSummary.cancelled ? "warn" : "default"}
            />
            <MetricCard label="Total Party Size" value={reservationSummary.partySize} />
            <MetricCard
              label="Reserved Tables"
              value={reservationSummary.tables}
              tone="good"
            />
          </dl>
        </div>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
                Walk-in
              </p>
              <h2 className="text-xl font-black">10-table capacity status</h2>
            </div>
            {adminLoading ? (
              <span className="text-xs font-black uppercase text-slate-500">
                Loading…
              </span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Walk-in Table Quota" value={overview?.walkin_table_quota ?? "—"} />
            <MetricCard
              label="Occupied Tables"
              value={overview?.occupied_tables ?? "—"}
              tone="warn"
            />
            <MetricCard
              label="Available Tables"
              value={overview?.available_tables ?? "—"}
              tone="good"
            />
            <MetricCard label="Waiting Count" value={overview?.waiting_count ?? "—"} />
            <MetricCard label="Called Count" value={overview?.called_count ?? "—"} />
            <MetricCard label="Seated Count" value={overview?.seated_count ?? "—"} />
            <MetricCard
              label="Current Called #"
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

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Recent reservations</h2>
            <Button
              icon={<CalendarCheck2 size={16} />}
              onClick={() => router.push("/counter/reservations")}
              variant="ghost"
            >
              View all
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
                    <span>Party {reservation.total_party_size}</span>
                    <span>Tables {reservation.table_count}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>
              {adminLoading ? "Loading reservations…" : "No reservations loaded."}
            </EmptyState>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Recent waitlist entries</h2>
            <Button
              icon={<Users size={16} />}
              onClick={() => router.push("/counter/waitlist")}
              variant="ghost"
            >
              View all
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
                    <span>Party {entry.party_size}</span>
                    <span>Tables {entry.required_tables}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>
              {adminLoading ? "Loading waitlist…" : "No waitlist entries loaded."}
            </EmptyState>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            icon={<CalendarCheck2 size={18} />}
            onClick={() => router.push("/counter/reservations")}
            variant="secondary"
          >
            Public Reservations
          </Button>
          <Button
            icon={<Users size={18} />}
            onClick={() => router.push("/counter/waitlist")}
            variant="secondary"
          >
            Walk-in Waitlist
          </Button>
          <Button
            icon={<KeyRound size={18} />}
            onClick={() => router.push("/counter/settings")}
            variant="secondary"
          >
            Settings
          </Button>
          <Button
            icon={<RefreshCw size={18} />}
            onClick={refresh}
            disabled={connectionLoading || adminLoading}
          >
            Refresh
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
