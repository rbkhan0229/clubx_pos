"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/common/Button";
import { api, ApiError } from "@/lib/api/client";
import type { AdminOperationStateResponse } from "@/lib/api/types";
import { formatKstDateTime } from "@/lib/utils/datetime";

type Props = {
  /** Called after the state changes so the parent can refresh dependent data. */
  onChange?: (state: AdminOperationStateResponse) => void;
  /** Optional initial state if the parent already loaded it (overview). */
  initialState?: {
    waitlist_open: boolean;
    waitlist_opened_at?: string | null;
    waitlist_closed_at?: string | null;
  } | null;
  compact?: boolean;
};

export function WaitlistOperationCard({ onChange, initialState, compact }: Props) {
  const [state, setState] = useState<AdminOperationStateResponse | null>(
    initialState
      ? {
          event_id: null,
          waitlist_open: !!initialState.waitlist_open,
          waitlist_opened_at: initialState.waitlist_opened_at ?? null,
          waitlist_closed_at: initialState.waitlist_closed_at ?? null,
        }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdminOperationStateResponse>(
        "/admin/pub-reservations/waitlist/operation",
      );
      setState(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "운영 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialState) load();
  }, [initialState, load]);

  async function flip(open: boolean) {
    setBusy(true);
    setError(null);
    try {
      const path = open
        ? "/admin/pub-reservations/waitlist/open"
        : "/admin/pub-reservations/waitlist/close";
      const res = await api.post<AdminOperationStateResponse>(path);
      setState(res);
      onChange?.(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "상태 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const isOpen = !!state?.waitlist_open;
  const statusLabel = isOpen ? "현장대기 접수 중" : "현장대기 중지됨";
  const statusTone = isOpen
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-600";
  const helper = isOpen
    ? state?.waitlist_opened_at
      ? `시작: ${formatKstDateTime(state.waitlist_opened_at)}`
      : "운영자가 현장대기를 시작했습니다."
    : state?.waitlist_closed_at
      ? `중지: ${formatKstDateTime(state.waitlist_closed_at)}`
      : "운영자가 현장대기를 시작해야 공개 페이지에서 신청할 수 있습니다.";

  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-club-lime">
            현장대기 운영
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black tracking-wide ${statusTone}`}
            >
              {loading ? "확인 중..." : statusLabel}
            </span>
            {state?.waitlist_opened_at ? (
              <span className="text-xs font-semibold text-slate-500">
                마지막 시작 {formatKstDateTime(state.waitlist_opened_at)}
              </span>
            ) : null}
            {state?.waitlist_closed_at ? (
              <span className="text-xs font-semibold text-slate-500">
                마지막 중지 {formatKstDateTime(state.waitlist_closed_at)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-600">{helper}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<PlayCircle size={16} />}
            disabled={busy || isOpen}
            onClick={() => flip(true)}
          >
            현장대기 시작
          </Button>
          <Button
            icon={<StopCircle size={16} />}
            variant="danger"
            disabled={busy || !isOpen}
            onClick={() => flip(false)}
          >
            현장대기 중지
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
