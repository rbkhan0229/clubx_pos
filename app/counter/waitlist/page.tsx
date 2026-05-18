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
import { api, ApiError } from "@/lib/api/client";
import {
  displayPhone,
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

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-slate-200 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
    >
      {status}
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
            Walk-in capacity
          </p>
          <h2 className="text-xl font-black sm:text-2xl">10-table quota</h2>
        </div>
        <Button
          icon={<PlayCircle size={18} />}
          onClick={onCallNext}
          disabled={callNextBusy || !overview || overview.available_tables <= 0}
        >
          {callNextBusy ? "Calling…" : "Call next"}
        </Button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Quota"
          value={overview ? overview.walkin_table_quota : "—"}
        />
        <Stat
          label="Occupied"
          value={overview ? overview.occupied_tables : "—"}
          tone="warn"
        />
        <Stat
          label="Available"
          value={overview ? overview.available_tables : "—"}
          tone="good"
        />
        <Stat
          label="Current called #"
          value={overview ? overview.current_called_number : "—"}
        />
        <Stat
          label="Waiting"
          value={overview ? overview.waiting_count : "—"}
        />
        <Stat label="Called" value={overview ? overview.called_count : "—"} />
        <Stat label="Seated" value={overview ? overview.seated_count : "—"} />
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
              : "No time preference"}
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          {formatDate(entry.created_at)}
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Name</dt>
          <dd className="font-black">{entry.name}</dd>
          <dd className="text-xs text-slate-600">{displayPhone(entry.phone_masked)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Party</dt>
          <dd className="font-black">{entry.party_size}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Tables</dt>
          <dd className="font-black">{entry.required_tables}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">
            Called / Seated
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
            Call
          </Button>
        )}
        {entry.status === "called" && (
          <>
            <Button
              icon={<CheckCircle2 size={16} />}
              onClick={() => onAction("seat", entry)}
              disabled={busy}
            >
              Seat
            </Button>
            <Button
              icon={<PhoneOff size={16} />}
              variant="secondary"
              onClick={() => onAction("no_show", entry)}
              disabled={busy}
            >
              No-show
            </Button>
            <Button
              icon={<XCircle size={16} />}
              variant="danger"
              onClick={() => onAction("cancel", entry)}
              disabled={busy}
            >
              Cancel
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
            Mark left
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
  call: "Call this party now?",
  seat: "Mark this party as seated?",
  no_show: "Mark this party as no-show?",
  cancel: "Cancel this waitlist entry?",
  leave: "Mark this party as left (frees their tables)?",
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
        err instanceof ApiError ? err.message : "Failed to load waitlist.";
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
        err instanceof ApiError ? err.message : "Action failed.";
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
        alert("No waiting entries that fit available tables.");
      }
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Call-next failed.";
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
            Dashboard
          </Button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
              ClubX POS · Walk-in
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">Waitlist</h1>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          onClick={load}
          variant="secondary"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

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
          No waitlist entries yet.
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
