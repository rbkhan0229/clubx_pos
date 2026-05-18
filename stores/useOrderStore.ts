"use client";

import { create } from "zustand";
import type { Order, OrderItem } from "@/types";

type NewOrderInput = {
  sessionId: string;
  visitId: string;
  items: Array<Pick<OrderItem, "menuItemId" | "menuName" | "unitPrice" | "quantity">>;
};

type OrderSummaryRow = {
  menuItemId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  amount: number;
  isService?: boolean;
};

type OrderTotals = {
  totalAmount: number;
  discountAmount: number;
};

type QuantityPayload = Record<string, number>;

type OrderState = {
  ordersBySession: Record<string, Order[]>;
  loadOrders: (sessionId: string) => void;
  createOrder: (input: NewOrderInput) => Order;
  getOrdersByVisit: (sessionId: string, visitId: string) => Order[];
  calculateOrderSummary: (sessionId: string, visitId: string) => OrderSummaryRow[];
  calculateTotalAmount: (sessionId: string, visitId: string) => number;
  calculateTotals: (sessionId: string, visitId: string) => OrderTotals;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  editOrderItems: (orderId: string, nextItems: NewOrderInput["items"]) => Order | undefined;
  cancelOrderItems: (sessionId: string, visitId: string, payload: QuantityPayload) => Order[];
  serviceOrderItems: (sessionId: string, visitId: string, payload: QuantityPayload) => Order[];
  markPayableItemsPaid: (sessionId: string, visitId: string, payload: QuantityPayload) => Order[];
  getAffectedOrdersForMenuItem: (sessionId: string, visitId: string, menuItemId: string) => Order[];
};

const orderKey = (sessionId: string) => `clubx-pos:orders:${sessionId}`;

function saveOrders(sessionId: string, orders: Order[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(orderKey(sessionId), JSON.stringify(orders));
}

function normalizeItemQuantity(item: OrderItem) {
  const cancelledQuantity = Math.min(item.quantity, Math.max(0, item.cancelledQuantity));
  const serviceQuantity = Math.min(
    item.quantity - cancelledQuantity,
    Math.max(0, item.serviceQuantity),
  );
  const paidQuantity = Math.min(
    item.quantity - cancelledQuantity,
    Math.max(0, item.paidQuantity ?? 0),
  );
  return { ...item, cancelledQuantity, serviceQuantity, paidQuantity };
}

export const useOrderStore = create<OrderState>((set, get) => ({
  ordersBySession: {},
  loadOrders: (sessionId) => {
    if (typeof window === "undefined") return;

    const rawOrders = window.localStorage.getItem(orderKey(sessionId));
    set((state) => ({
      ordersBySession: {
        ...state.ordersBySession,
        [sessionId]: rawOrders ? (JSON.parse(rawOrders) as Order[]) : [],
      },
    }));
  },
  createOrder: ({ sessionId, visitId, items }) => {
    const current = get().ordersBySession[sessionId] ?? [];
    const now = new Date().toISOString();
    const order: Order = {
      id: `order-${sessionId}-${Date.now()}`,
      sessionId,
      visitId,
      orderNumber: current.length + 1,
      orderedBy: {
        type: "counter",
        name: "Counter",
      },
      orderType: current.some((item) => item.visitId === visitId) ? "additional" : "initial",
      items: items.map((item) => ({
        id: `order-item-${item.menuItemId}-${Date.now()}`,
        menuItemId: item.menuItemId,
        menuName: item.menuName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        serviceQuantity: 0,
        cancelledQuantity: 0,
        paidQuantity: 0,
      })),
      createdAt: now,
      updatedAt: now,
    };
    const next = [...current, order];
    saveOrders(sessionId, next);
    set((state) => ({
      ordersBySession: {
        ...state.ordersBySession,
        [sessionId]: next,
      },
    }));
    return order;
  },
  getOrdersByVisit: (sessionId, visitId) =>
    (get().ordersBySession[sessionId] ?? []).filter((order) => order.visitId === visitId),
  calculateOrderSummary: (sessionId, visitId) => {
    const rows = new Map<string, OrderSummaryRow>();
    get()
      .getOrdersByVisit(sessionId, visitId)
      .flatMap((order) => order.items)
      .forEach((item) => {
        const normalized = normalizeItemQuantity(item);
        const activeQuantity =
          normalized.quantity - normalized.cancelledQuantity - normalized.paidQuantity;
        const serviceQuantity = Math.min(normalized.serviceQuantity, activeQuantity);
        const paidQuantity = activeQuantity - serviceQuantity;

        if (paidQuantity > 0) {
          const key = `${item.menuItemId}:paid`;
          const current = rows.get(key);
          rows.set(key, {
            menuItemId: item.menuItemId,
            menuName: item.menuName,
            unitPrice: item.unitPrice,
            quantity: (current?.quantity ?? 0) + paidQuantity,
            discount: current?.discount ?? 0,
            amount: (current?.amount ?? 0) + paidQuantity * item.unitPrice,
          });
        }

        if (serviceQuantity > 0) {
          const key = `${item.menuItemId}:service`;
          const current = rows.get(key);
          rows.set(key, {
            menuItemId: item.menuItemId,
            menuName: item.menuName,
            unitPrice: item.unitPrice,
            quantity: (current?.quantity ?? 0) + serviceQuantity,
            discount: (current?.discount ?? 0) + serviceQuantity * item.unitPrice,
            amount: 0,
            isService: true,
          });
        }
      });
    return [...rows.values()];
  },
  calculateTotalAmount: (sessionId, visitId) =>
    get()
      .calculateOrderSummary(sessionId, visitId)
      .reduce((sum, row) => sum + row.amount, 0),
  calculateTotals: (sessionId, visitId) => {
    const rows = get().calculateOrderSummary(sessionId, visitId);
    return {
      totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
      discountAmount: rows.reduce((sum, row) => sum + row.discount, 0),
    };
  },
  updateOrder: (orderId, updates) => {
    const sessionId = Object.keys(get().ordersBySession).find((id) =>
      get().ordersBySession[id].some((order) => order.id === orderId),
    );
    if (!sessionId) return;
    const next = get().ordersBySession[sessionId].map((order) =>
      order.id === orderId
        ? { ...order, ...updates, updatedAt: new Date().toISOString() }
        : order,
    );
    saveOrders(sessionId, next);
    set((state) => ({
      ordersBySession: {
        ...state.ordersBySession,
        [sessionId]: next,
      },
    }));
  },
  editOrderItems: (orderId, nextItems) => {
    const sessionId = Object.keys(get().ordersBySession).find((id) =>
      get().ordersBySession[id].some((order) => order.id === orderId),
    );
    if (!sessionId) return undefined;
    const now = new Date().toISOString();
    let edited: Order | undefined;
    const next = get().ordersBySession[sessionId].map((order) => {
      if (order.id !== orderId) return order;
      const paidByMenuItem = order.items.reduce<Record<string, number>>((nextPaid, item) => {
        nextPaid[item.menuItemId] = (nextPaid[item.menuItemId] ?? 0) + (item.paidQuantity ?? 0);
        return nextPaid;
      }, {});
      edited = {
        ...order,
        orderType: "modified",
        items: nextItems.map((item) => ({
          id: `order-item-${item.menuItemId}-${Date.now()}-${Math.random()}`,
          menuItemId: item.menuItemId,
          menuName: item.menuName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          serviceQuantity: 0,
          cancelledQuantity: 0,
          paidQuantity: Math.min(item.quantity, paidByMenuItem[item.menuItemId] ?? 0),
        })),
        updatedAt: now,
      };
      return edited;
    });
    saveOrders(sessionId, next);
    set((state) => ({
      ordersBySession: { ...state.ordersBySession, [sessionId]: next },
    }));
    return edited;
  },
  cancelOrderItems: (sessionId, visitId, payload) => {
    const affected: Order[] = [];
    let remaining = { ...payload };
    const currentOrders = get().ordersBySession[sessionId] ?? [];
    const nextById = new Map<string, Order>();
    const sortedVisitOrders = currentOrders
      .filter((order) => order.visitId === visitId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    sortedVisitOrders.forEach((order) => {
      let changed = false;
      const nextItems = order.items.map((item) => {
        const requested = remaining[item.menuItemId] ?? 0;
        if (requested <= 0) return item;
        const normalized = normalizeItemQuantity(item);
        const available =
          normalized.quantity - normalized.cancelledQuantity - normalized.paidQuantity;
        const delta = Math.min(available, requested);
        if (delta <= 0) return item;
        remaining[item.menuItemId] = requested - delta;
        changed = true;
        return normalizeItemQuantity({
          ...normalized,
          cancelledQuantity: normalized.cancelledQuantity + delta,
        });
      });
      const nextOrder = changed
        ? { ...order, items: nextItems, updatedAt: new Date().toISOString() }
        : order;
      if (changed) affected.push(nextOrder);
      nextById.set(order.id, nextOrder);
    });

    const nextOrders = currentOrders.map((order) => nextById.get(order.id) ?? order);
    saveOrders(sessionId, nextOrders);
    set((state) => ({
      ordersBySession: { ...state.ordersBySession, [sessionId]: nextOrders },
    }));
    return affected.sort((a, b) => b.orderNumber - a.orderNumber);
  },
  serviceOrderItems: (sessionId, visitId, payload) => {
    const affected: Order[] = [];
    let remaining = { ...payload };
    const currentOrders = get().ordersBySession[sessionId] ?? [];
    const nextById = new Map<string, Order>();
    const sortedVisitOrders = currentOrders
      .filter((order) => order.visitId === visitId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    sortedVisitOrders.forEach((order) => {
      let changed = false;
      const nextItems = order.items.map((item) => {
        const requested = remaining[item.menuItemId] ?? 0;
        if (requested <= 0) return item;
        const normalized = normalizeItemQuantity(item);
        const available =
          normalized.quantity -
          normalized.cancelledQuantity -
          normalized.paidQuantity;
        const delta = Math.min(available, requested);
        if (delta <= 0) return item;
        remaining[item.menuItemId] = requested - delta;
        changed = true;
        return normalizeItemQuantity({
          ...normalized,
          serviceQuantity: normalized.serviceQuantity + delta,
        });
      });
      const nextOrder = changed
        ? { ...order, items: nextItems, updatedAt: new Date().toISOString() }
        : order;
      if (changed) affected.push(nextOrder);
      nextById.set(order.id, nextOrder);
    });

    const nextOrders = currentOrders.map((order) => nextById.get(order.id) ?? order);
    saveOrders(sessionId, nextOrders);
    set((state) => ({
      ordersBySession: { ...state.ordersBySession, [sessionId]: nextOrders },
    }));
    return affected.sort((a, b) => b.orderNumber - a.orderNumber);
  },
  markPayableItemsPaid: (sessionId, visitId, payload) => {
    const affected: Order[] = [];
    let remaining = { ...payload };
    const currentOrders = get().ordersBySession[sessionId] ?? [];
    const nextById = new Map<string, Order>();
    const sortedVisitOrders = currentOrders
      .filter((order) => order.visitId === visitId)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

    sortedVisitOrders.forEach((order) => {
      let changed = false;
      const nextItems = order.items.map((item) => {
        const normalized = normalizeItemQuantity(item);
        const requested = remaining[normalized.menuItemId] ?? 0;
        if (requested <= 0) return normalized;
        const available =
          normalized.quantity -
          normalized.cancelledQuantity -
          normalized.serviceQuantity -
          normalized.paidQuantity;
        const delta = Math.min(available, requested);
        if (delta <= 0) return normalized;
        remaining[normalized.menuItemId] = requested - delta;
        changed = true;
        return normalizeItemQuantity({
          ...normalized,
          paidQuantity: normalized.paidQuantity + delta,
        });
      });
      const nextOrder = changed
        ? { ...order, items: nextItems, updatedAt: new Date().toISOString() }
        : { ...order, items: nextItems };
      if (changed) affected.push(nextOrder);
      nextById.set(order.id, nextOrder);
    });

    const nextOrders = currentOrders.map((order) => nextById.get(order.id) ?? order);
    saveOrders(sessionId, nextOrders);
    set((state) => ({
      ordersBySession: { ...state.ordersBySession, [sessionId]: nextOrders },
    }));
    return affected;
  },
  getAffectedOrdersForMenuItem: (sessionId, visitId, menuItemId) =>
    get()
      .getOrdersByVisit(sessionId, visitId)
      .filter((order) =>
        order.items.some(
          (item) => item.menuItemId === menuItemId && item.quantity - item.cancelledQuantity > 0,
        ),
      )
      .sort((a, b) => b.orderNumber - a.orderNumber),
}));
