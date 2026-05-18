"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { usePaymentStore } from "@/stores/usePaymentStore";
import type { Payment } from "@/types";

type SalesReportModalProps = {
  open: boolean;
  sessionId: string;
  onClose: () => void;
};

export function SalesReportModal({ open, sessionId, onClose }: SalesReportModalProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadPayments = usePaymentStore((state) => state.loadPayments);
  const payments = usePaymentStore((state) => state.paymentsBySession[sessionId] ?? []);
  const cancelPayment = usePaymentStore((state) => state.cancelPayment);
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);
  const totalSales = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + payment.totalAmount, 0),
    [payments],
  );
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
    [payments],
  );

  useEffect(() => {
    if (open) loadPayments(sessionId);
  }, [loadPayments, open, sessionId]);

  return (
    <Modal
      bodyClassName="flex-1 overflow-hidden"
      className="h-[88vh] max-h-[88vh] w-[94vw] max-w-[1500px] p-6"
      onClose={onClose}
      open={open}
      title={t.salesReport}
    >
      <div className="grid h-full gap-4 overflow-y-auto pr-1">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-black text-slate-500">{t.totalSales}</p>
          <p className="mt-1 text-4xl font-black">{formatMoney(totalSales)}</p>
        </section>

        <section className="grid gap-3">
          <h3 className="text-lg font-black">{t.paymentList}</h3>
          {sortedPayments.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
              {t.noPaymentsYet}
            </p>
          ) : (
            <div className="grid gap-3">
              {sortedPayments.map((payment) => (
                <div
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  key={payment.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {payment.tableLabel} · {payment.isPrepaid ? t.prepayment : t.payment}
                      </p>
                      <p className="text-sm font-bold text-slate-500">
                        {t.paymentDate}: {formatDate(payment.paidAt)} · {t.paymentTime}:{" "}
                        {formatTime(payment.paidAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        payment.status === "paid"
                          ? "bg-lime-100 text-club-green"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {payment.status === "paid" ? t.paid : t.cancelled}
                    </span>
                  </div>

                  <div className="grid gap-1 text-sm font-bold text-slate-700">
                    {payment.items.map((item, index) => (
                      <div className="flex justify-between gap-3" key={`${payment.id}-${index}`}>
                        <span>
                          {item.menuName} x {item.quantity}
                        </span>
                        <span>{formatMoney(item.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 border-t border-slate-100 pt-3 text-sm font-black sm:grid-cols-3">
                    <p>
                      {t.paymentAmount}: {formatMoney(payment.totalAmount)}
                    </p>
                    <p>
                      {t.discountAmount}: {formatMoney(payment.discountAmount)}
                    </p>
                    {payment.status === "paid" ? (
                      <Button
                        className="min-h-0 px-4 py-2"
                        onClick={() => setCancelTarget(payment)}
                        variant="danger"
                      >
                        {t.cancelPayment}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        onClose={() => setCancelTarget(null)}
        open={Boolean(cancelTarget)}
        title={t.confirmCancelPaymentTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.confirmCancelPaymentPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setCancelTarget(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (cancelTarget) cancelPayment(sessionId, cancelTarget.id);
                setCancelTarget(null);
              }}
              variant="danger"
            >
              {t.cancelPayment}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
