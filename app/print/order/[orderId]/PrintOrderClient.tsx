"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import type { PosOrderDto } from "@/types/posApi";

type PrintOrderClientProps = {
  orderId: string;
  sessionId: string;
  visitId?: string;
  tableLabel?: string;
};

const REQUEST_ITEM_PREFIX = "__REQ__:";

export function PrintOrderClient({
  orderId,
  sessionId,
  visitId,
  tableLabel,
}: PrintOrderClientProps) {
  const [order, setOrder] = useState<PosOrderDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadOrder() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/clubx/pos/sessions/${sessionId}/orders`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`주문을 불러오지 못했습니다. (${response.status})`);
        const orders = (await response.json()) as PosOrderDto[];
        const found = orders.find((item) => item.id === orderId);
        if (!found) throw new Error("주문을 찾을 수 없습니다.");
        if (alive) setOrder(found);
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : "주문을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadOrder();
    return () => {
      alive = false;
    };
  }, [orderId, sessionId]);

  const requestText = useMemo(
    () =>
      order?.items
        .find((item) => item.menu_name.startsWith(REQUEST_ITEM_PREFIX))
        ?.menu_name.slice(REQUEST_ITEM_PREFIX.length)
        .trim() ?? "",
    [order],
  );
  const visibleItems = useMemo(
    () => order?.items.filter((item) => !item.menu_name.startsWith(REQUEST_ITEM_PREFIX)) ?? [],
    [order],
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-club-black print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
      <section className="mx-auto grid max-w-md gap-4 bg-white p-5 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <div className="no-print flex justify-end gap-2">
          <Button onClick={() => window.print()}>프린트</Button>
          <Button onClick={() => window.close()} variant="secondary">
            닫기
          </Button>
        </div>

        <header className="border-b-2 border-club-black pb-3">
          <h1 className="text-3xl font-black leading-tight print:text-2xl">KUBA In-Flight Meals</h1>
          <p className="mt-1 text-sm font-black">주문서</p>
        </header>

        {loading ? <p className="py-10 text-center font-black">주문을 불러오는 중...</p> : null}
        {error ? <p className="py-10 text-center font-black text-red-700">{error}</p> : null}

        {order ? (
          <>
            <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-base font-bold">
              <dt>주문번호</dt>
              <dd className="font-black">#{order.order_number}</dd>
              <dt>테이블/Visit</dt>
              <dd>{tableLabel || visitId || order.visit_id}</dd>
              <dt>주문시간</dt>
              <dd>{formatDateTime(order.created_at)}</dd>
              <dt>주문자</dt>
              <dd>{order.ordered_by_name}</dd>
            </dl>

            <div className="border-y-2 border-club-black py-3">
              {visibleItems.map((item) => (
                <div
                  className="grid grid-cols-[1fr_48px] gap-3 py-2 text-xl font-black print:text-lg"
                  key={item.id}
                >
                  <span>{item.menu_name}</span>
                  <span className="text-right">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <section className="min-h-20 rounded-xl border border-slate-300 p-3 print:rounded-none">
              <h2 className="text-sm font-black">요청사항</h2>
              <p className="mt-2 whitespace-pre-wrap text-lg font-bold">
                {requestText || "없음"}
              </p>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
