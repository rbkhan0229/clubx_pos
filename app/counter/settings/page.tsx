"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, PlugZap, Trash2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { getAdminToken, getApiBase, api } from "@/lib/api/client";
import type { AdminReservationListResponse } from "@/lib/api/types";

const TOKEN_KEY = "clubx_admin_token";

export default function CounterSettingsPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setToken(getAdminToken());
  }, []);

  function saveToken() {
    window.localStorage.setItem(TOKEN_KEY, token.trim());
    setMessage("Admin token saved.");
  }

  function clearToken() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setMessage("Admin token cleared.");
  }

  async function testConnection() {
    setTesting(true);
    setMessage("");
    try {
      const response = await api.get<AdminReservationListResponse>(
        "/admin/pub-reservations/reservations",
        { limit: 1 },
      );
      const count =
        response.total ??
        response.data?.length ??
        response.items?.length ??
        response.reservations?.length ??
        0;
      setMessage(`Connection OK. Reservation count signal: ${count}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-club-lime">
            POS Settings
          </p>
          <h1 className="mt-2 text-3xl font-black">예약 API 설정</h1>
        </div>
        <Link href="/counter/dashboard">
          <Button icon={<ArrowLeft size={18} />} variant="secondary">
            대시보드
          </Button>
        </Link>
      </div>

      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-500">API Base</p>
          <p className="mt-2 break-all text-sm font-black text-club-ink">{getApiBase()}</p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">Admin Token</span>
          <textarea
            className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-club-green"
            onChange={(event) => setToken(event.target.value)}
            placeholder="Bearer token without the Bearer prefix"
            value={token}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button icon={<CheckCircle2 size={18} />} onClick={saveToken}>
            저장
          </Button>
          <Button icon={<Trash2 size={18} />} onClick={clearToken} variant="secondary">
            지우기
          </Button>
          <Button
            disabled={testing}
            icon={<PlugZap size={18} />}
            onClick={testConnection}
            variant="secondary"
          >
            {testing ? "테스트 중..." : "연결 테스트"}
          </Button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            {message}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
