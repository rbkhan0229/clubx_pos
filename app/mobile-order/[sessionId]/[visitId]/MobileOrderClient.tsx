"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Send } from "lucide-react";
import { Button } from "@/components/common/Button";
import { KUBA_IN_FLIGHT_MENU_ITEMS } from "@/lib/pos/kubaMenuSeed";

type MobileOrderClientProps = {
  sessionId: string;
  visitId: string;
};

const IDEMPOTENCY_PREFIX = "clubx-mobile-order:idempotency";
const LAST_SIGNATURE_PREFIX = "clubx-mobile-order:last-signature";
const REQUEST_ITEM_PREFIX = "__REQ__:";

export function MobileOrderClient({ sessionId, visitId }: MobileOrderClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedItems = useMemo(
    () =>
      KUBA_IN_FLIGHT_MENU_ITEMS.map((item) => ({
        ...item,
        quantity: quantities[item.id] ?? 0,
      })).filter((item) => item.quantity > 0),
    [quantities],
  );
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function setQuantity(itemId: string, nextQuantity: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(99, nextQuantity)),
    }));
  }

  async function submitOrder() {
    if (totalQuantity <= 0 || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    const signature = JSON.stringify({
      visitId,
      items: selectedItems.map((item) => [item.id, item.quantity]),
      requests: requests.trim(),
    });
    const signatureKey = `${LAST_SIGNATURE_PREFIX}:${visitId}`;
    const idempotencyKeyKey = `${IDEMPOTENCY_PREFIX}:${visitId}`;
    const lastSignature = window.localStorage.getItem(signatureKey);
    const idempotencyKey =
      lastSignature === signature && window.localStorage.getItem(idempotencyKeyKey)
        ? window.localStorage.getItem(idempotencyKeyKey) ?? crypto.randomUUID()
        : crypto.randomUUID();
    const clientGeneratedOrderId = crypto.randomUUID();

    window.localStorage.setItem(signatureKey, signature);
    window.localStorage.setItem(idempotencyKeyKey, idempotencyKey);

    try {
      const orderItems = selectedItems.map((item) => ({
        menu_item_id: null,
        menu_name: item.displayName,
        quantity: item.quantity,
        unit_price: item.price,
      }));
      const trimmedRequests = requests.trim();
      if (trimmedRequests) {
        orderItems.push({
          menu_item_id: null,
          menu_name: `${REQUEST_ITEM_PREFIX}${trimmedRequests}`,
          quantity: 0,
          unit_price: 0,
        });
      }

      const response = await fetch(`/api/clubx/pos/sessions/${sessionId}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visit_id: visitId,
          order_type: "qrFallback",
          ordered_by_type: "qr",
          ordered_by_name: "모바일 주문",
          idempotency_key: idempotencyKey,
          client_generated_order_id: clientGeneratedOrderId,
          source: "mobile_qr",
          items: orderItems,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          typeof payload?.detail === "string"
            ? payload.detail
            : Array.isArray(payload?.detail)
              ? payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ")
              : "";
        throw new Error(detail || `주문 접수에 실패했습니다. (${response.status})`);
      }

      setMessage("주문이 접수되었습니다");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "주문 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-md flex-col gap-5">
        <header className="rounded-3xl bg-white p-5 text-club-black">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-club-green">
            Mobile Order
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight">KUBA In-Flight Meals</h1>
          <p className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-black text-slate-700">
            주류는 판매하지 않습니다. 개인 지참 부탁드립니다.
          </p>
        </header>

        <section className="grid gap-3">
          {KUBA_IN_FLIGHT_MENU_ITEMS.map((item) => {
            const quantity = quantities[item.id] ?? 0;
            return (
              <article
                className="rounded-3xl border border-white/10 bg-white p-4 text-club-black shadow-sm"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black leading-tight">{item.nameEn}</p>
                    <p className="mt-1 text-base font-black text-slate-600">{item.nameKo}</p>
                    <p className="mt-2 text-sm font-bold text-club-green">
                      {item.price > 0 ? `${item.price.toLocaleString("ko-KR")}원` : "가격 현장 안내"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      aria-label={`${item.displayName} 수량 감소`}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 disabled:opacity-40"
                      disabled={quantity <= 0}
                      onClick={() => setQuantity(item.id, quantity - 1)}
                      type="button"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="grid h-11 min-w-10 place-items-center text-xl font-black">
                      {quantity}
                    </span>
                    <button
                      aria-label={`${item.displayName} 수량 증가`}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-club-acid"
                      onClick={() => setQuantity(item.id, quantity + 1)}
                      type="button"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <label className="grid gap-2 rounded-3xl bg-white p-4 text-club-black">
          <span className="text-sm font-black">요청사항</span>
          <textarea
            className="min-h-24 resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base font-bold outline-none focus:border-club-green"
            maxLength={100}
            onChange={(event) => setRequests(event.target.value)}
            placeholder="알레르기, 맵기 조절 등"
            value={requests}
          />
        </label>

        {message ? (
          <div className="rounded-3xl border border-club-green/40 bg-lime-100 p-4 text-center text-lg font-black text-club-black">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-3xl border border-red-300 bg-red-50 p-4 text-center text-sm font-black text-red-700">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-4 mt-auto rounded-3xl bg-white p-4 text-club-black shadow-2xl">
          <div className="mb-3 flex items-center justify-between text-sm font-black">
            <span>총 수량 {totalQuantity}</span>
            <span>{totalAmount > 0 ? `${totalAmount.toLocaleString("ko-KR")}원` : "현장 결제"}</span>
          </div>
          <Button
            className="w-full"
            disabled={totalQuantity <= 0 || submitting}
            icon={<Send size={18} />}
            onClick={submitOrder}
          >
            {submitting ? "주문 접수 중..." : "주문하기"}
          </Button>
        </div>
      </div>
    </main>
  );
}
