"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Server } from "lucide-react";
import { AppShell } from "@/components/common/AppShell";
import { Button } from "@/components/common/Button";
import { getApiBase } from "@/lib/api/client";

export default function CounterSettingsPage() {
  const router = useRouter();
  const apiBase = getApiBase() || "설정되지 않음";

  return (
    <AppShell compact>
      <div className="mb-5 flex items-center justify-between">
        <Button
          icon={<ArrowLeft size={18} />}
          onClick={() => router.push("/counter/dashboard")}
          variant="secondary"
        >
          대시보드로
        </Button>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black sm:text-3xl">POS 설정</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          운영용 예약/현장대기 API는 관리자 토큰 없이 바로 사용합니다. 이
          화면에서는 현재 연결된 백엔드 주소만 확인합니다.
        </p>

        <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 font-black text-slate-600">
              <Server size={16} />
              API 주소
            </dt>
            <dd className="truncate text-right font-mono text-slate-700">
              {apiBase}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="flex items-center gap-2 font-black text-slate-600">
              <CheckCircle2 size={16} />
              운영 접근
            </dt>
            <dd className="text-right font-black text-emerald-700">
              토큰 불필요
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => router.push("/counter/admin")}>
            운영 대시보드로 이동
          </Button>
          <Button
            onClick={() => router.push("/counter/dashboard")}
            variant="secondary"
          >
            POS 대시보드로 이동
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
