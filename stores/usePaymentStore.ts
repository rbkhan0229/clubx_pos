"use client";

import { create } from "zustand";
import { broadcastClubxSync } from "@/lib/localSync";
import type { Payment, PaymentItem } from "@/types";

type NewPaymentInput = {
  sessionId: string;
  visitId: string;
  tableLabel: string;
  items: PaymentItem[];
  totalAmount: number;
  discountAmount: number;
  isPrepaid: boolean;
};

type PaymentState = {
  paymentsBySession: Record<string, Payment[]>;
  loadPayments: (sessionId: string) => void;
  createPayment: (input: NewPaymentInput) => Payment;
  cancelPayment: (sessionId: string, paymentId: string) => void;
  getPaymentsBySession: (sessionId: string) => Payment[];
  getPaymentsByVisit: (sessionId: string, visitId: string) => Payment[];
  calculateSessionSalesTotal: (sessionId: string) => number;
  getActiveSalesReportRows: (sessionId: string) => Payment[];
};

const paymentKey = (sessionId: string) => `clubx-pos:payments:${sessionId}`;

function savePayments(sessionId: string, payments: Payment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(paymentKey(sessionId), JSON.stringify(payments));
  broadcastClubxSync({ sessionId, store: "payments" });
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  paymentsBySession: {},
  loadPayments: (sessionId) => {
    if (typeof window === "undefined") return;

    const rawPayments = window.localStorage.getItem(paymentKey(sessionId));
    set((state) => ({
      paymentsBySession: {
        ...state.paymentsBySession,
        [sessionId]: rawPayments ? (JSON.parse(rawPayments) as Payment[]) : [],
      },
    }));
  },
  createPayment: (input) => {
    const current = get().paymentsBySession[input.sessionId] ?? [];
    const payment: Payment = {
      id: `payment-${input.sessionId}-${Date.now()}`,
      sessionId: input.sessionId,
      visitId: input.visitId,
      tableLabel: input.tableLabel,
      paidAt: new Date().toISOString(),
      items: input.items,
      totalAmount: input.totalAmount,
      discountAmount: input.discountAmount,
      status: "paid",
      isPrepaid: input.isPrepaid,
    };
    const next = [...current, payment];
    savePayments(input.sessionId, next);
    set((state) => ({
      paymentsBySession: {
        ...state.paymentsBySession,
        [input.sessionId]: next,
      },
    }));
    return payment;
  },
  cancelPayment: (sessionId, paymentId) => {
    const next = (get().paymentsBySession[sessionId] ?? []).map((payment) =>
      payment.id === paymentId ? { ...payment, status: "cancelled" as const } : payment,
    );
    savePayments(sessionId, next);
    set((state) => ({
      paymentsBySession: {
        ...state.paymentsBySession,
        [sessionId]: next,
      },
    }));
  },
  getPaymentsBySession: (sessionId) => get().paymentsBySession[sessionId] ?? [],
  getPaymentsByVisit: (sessionId, visitId) =>
    (get().paymentsBySession[sessionId] ?? []).filter((payment) => payment.visitId === visitId),
  calculateSessionSalesTotal: (sessionId) =>
    (get().paymentsBySession[sessionId] ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + payment.totalAmount, 0),
  getActiveSalesReportRows: (sessionId) =>
    [...(get().paymentsBySession[sessionId] ?? [])].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    ),
}));
