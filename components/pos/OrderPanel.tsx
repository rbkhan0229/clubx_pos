"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { printOrderSlip } from "@/lib/mock/printOrderSlip";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { useAppStore } from "@/stores/useAppStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { usePaymentStore } from "@/stores/usePaymentStore";
import { useTableStore } from "@/stores/useTableStore";
import { useVisitStore } from "@/stores/useVisitStore";
import type { MenuCategory, MenuItem, Order, PartyCard, Payment, Table, Visit } from "@/types";

const EMPTY_ORDERS: Order[] = [];
const EMPTY_MENU_ITEMS: MenuItem[] = [];
const EMPTY_PARTY_CARDS: PartyCard[] = [];
const EMPTY_PAYMENTS: Payment[] = [];
const EMPTY_TABLES: Table[] = [];
const EMPTY_LOGS: Array<{
  id: string;
  visitId: string;
  minutes: number;
  messageKo: string;
  messageEn: string;
  createdAt: string;
}> = [];
const EMPTY_CATEGORIES: MenuCategory[] = [];

type OrderPanelProps = {
  open: boolean;
  table: Table | null;
  visit: Visit | null;
  partyCard: PartyCard | null;
  onClose: () => void;
};

type OrderPanelMode =
  | "summary"
  | "addOrder"
  | "editOrder"
  | "cancelItems"
  | "serviceItems"
  | "payment"
  | "prepayment";

export function OrderPanel({ open, table, visit, partyCard, onClose }: OrderPanelProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const [mode, setMode] = useState<OrderPanelMode>("summary");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editConfirmOrder, setEditConfirmOrder] = useState<Order | null>(null);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loadPayments = usePaymentStore((state) => state.loadPayments);

  useEffect(() => {
    if (open && table) {
      loadMenu(table.sessionId);
      loadOrders(table.sessionId);
      loadPayments(table.sessionId);
    }
  }, [loadMenu, loadOrders, loadPayments, open, table]);

  if (!table || !visit || !partyCard) return null;

  return (
    <Modal
      bodyClassName="flex-1 overflow-hidden"
      className="h-[94vh] max-h-[94vh] w-[calc(100vw-24px)] max-w-none p-6"
      onClose={onClose}
      open={open}
      title={mode === "summary" ? t.orderPanel : modeTitle(mode, t)}
    >
      <div className="grid h-full gap-4 overflow-y-auto pr-1">
        {mode === "addOrder" ? (
          <AddOrderView
            onCancel={() => setMode("summary")}
            onComplete={() => setMode("summary")}
            table={table}
            visit={visit}
          />
        ) : mode === "editOrder" && editingOrder ? (
          <EditOrderView
            onCancel={() => {
              setEditingOrder(null);
              setMode("summary");
            }}
            onComplete={() => {
              setEditingOrder(null);
              setMode("summary");
            }}
            order={editingOrder}
            table={table}
            visit={visit}
          />
        ) : mode === "cancelItems" ? (
          <AdjustmentView
            kind="cancel"
            onCancel={() => setMode("summary")}
            onComplete={() => setMode("summary")}
            table={table}
            visit={visit}
          />
        ) : mode === "serviceItems" ? (
          <AdjustmentView
            kind="service"
            onCancel={() => setMode("summary")}
            onComplete={() => setMode("summary")}
            table={table}
            visit={visit}
          />
        ) : mode === "payment" || mode === "prepayment" ? (
          <PaymentView
            isPrepaid={mode === "prepayment"}
            onBack={() => setMode("summary")}
            onClosePanel={onClose}
            table={table}
            visit={visit}
          />
        ) : (
          <OrderPanelHome
            onAddOrder={() => setMode("addOrder")}
            onCancelItems={() => setMode("cancelItems")}
            onEditOrder={(order) => setEditConfirmOrder(order)}
            onPay={() => setMode("payment")}
            onPrepay={() => setMode("prepayment")}
            onServiceItems={() => setMode("serviceItems")}
            table={table}
            visit={visit}
          />
        )}
      </div>
      <Modal
        onClose={() => setEditConfirmOrder(null)}
        open={Boolean(editConfirmOrder)}
        title={t.editThisOrderTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.editThisOrderPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setEditConfirmOrder(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                setEditingOrder(editConfirmOrder);
                setEditConfirmOrder(null);
                setMode("editOrder");
              }}
            >
              {t.editOrder}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function modeTitle(mode: OrderPanelMode, t: ReturnType<typeof getDictionary>) {
  if (mode === "addOrder") return t.addOrder;
  if (mode === "editOrder") return t.editOrder;
  if (mode === "cancelItems") return t.cancelOrderItems;
  if (mode === "serviceItems") return t.serviceItems;
  if (mode === "payment") return t.payment;
  if (mode === "prepayment") return t.prepayment;
  return t.orderPanel;
}

function OrderPanelHome({
  onAddOrder,
  onCancelItems,
  onEditOrder,
  onPay,
  onPrepay,
  onServiceItems,
  table,
  visit,
}: {
  onAddOrder: () => void;
  onCancelItems: () => void;
  onEditOrder: (order: Order) => void;
  onPay: () => void;
  onPrepay: () => void;
  onServiceItems: () => void;
  table: Table;
  visit: Visit;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const allOrders = useOrderStore(
    (state) => state.ordersBySession[table.sessionId] ?? EMPTY_ORDERS,
  );
  const payments = usePaymentStore(
    (state) => state.paymentsBySession[table.sessionId] ?? EMPTY_PAYMENTS,
  );
  const latestVisit = useVisitStore((state) =>
    state.visitsBySession[table.sessionId]?.find((item) => item.id === visit.id),
  );
  const sessionTables = useTableStore(
    (state) => state.tablesBySession[table.sessionId] ?? EMPTY_TABLES,
  );
  const activeVisit = latestVisit ?? visit;
  const tableLabel = getVisitTableLabel(activeVisit, sessionTables, table);
  const adjustVisitTime = useVisitStore((state) => state.adjustVisitTime);
  const partyCards = useVisitStore(
    (state) => state.partyCardsBySession[table.sessionId] ?? EMPTY_PARTY_CARDS,
  );
  const logs = useVisitStore(
    (state) => state.timeLogsByVisit[activeVisit.id] ?? EMPTY_LOGS,
  );
  const orders = useMemo(
    () => allOrders.filter((order) => order.visitId === activeVisit.id),
    [activeVisit.id, allOrders],
  );
  const summary = useMemo(() => {
    const rows = new Map<
      string,
      {
        menuItemId: string;
        menuName: string;
        unitPrice: number;
        quantity: number;
        discount: number;
        amount: number;
        isService?: boolean;
      }
    >();

    orders
      .flatMap((order) => order.items)
      .forEach((item) => {
        const paidQuantity = item.paidQuantity ?? 0;
        const activeQuantity = Math.max(0, item.quantity - item.cancelledQuantity - paidQuantity);
        const serviceQuantity = Math.min(item.serviceQuantity, activeQuantity);
        const payableQuantity = activeQuantity - serviceQuantity;
        if (payableQuantity > 0) {
          const key = `${item.menuItemId}:paid`;
          const current = rows.get(key);
          rows.set(key, {
            menuItemId: item.menuItemId,
            menuName: item.menuName,
            unitPrice: item.unitPrice,
            quantity: (current?.quantity ?? 0) + payableQuantity,
            discount: current?.discount ?? 0,
            amount: (current?.amount ?? 0) + payableQuantity * item.unitPrice,
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
  }, [orders]);
  const total = useMemo(
    () => summary.reduce((sum, row) => sum + row.amount, 0),
    [summary],
  );
  const discountTotal = useMemo(
    () => summary.reduce((sum, row) => sum + row.discount, 0),
    [summary],
  );
  const hasPayableItems = total > 0;
  const hasPreviousPayment = payments.some(
    (payment) => payment.visitId === activeVisit.id && payment.status === "paid",
  );
  const hasAnyOrderHistory = orders.length > 0;
  const canPay = hasPayableItems || (hasPreviousPayment && hasAnyOrderHistory);
  const isFinalCheckout = !hasPayableItems && hasPreviousPayment && hasAnyOrderHistory;
  const remainingMinutes = Math.max(
    0,
    Math.ceil((new Date(activeVisit.expectedEndAt).getTime() - Date.now()) / 60_000),
  );
  const mappedPartyCards = useMemo(
    () =>
      activeVisit.partyCardIds
        .map((partyCardId) => partyCards.find((partyCard) => partyCard.id === partyCardId))
        .filter((partyCard): partyCard is NonNullable<typeof partyCard> => Boolean(partyCard)),
    [activeVisit.partyCardIds, partyCards],
  );

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
          {t.orderPanel}
        </p>
        <h2 className="text-4xl font-black">
          {t.table} {tableLabel}
        </h2>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black">{t.orderSummary}</h3>
          {summary.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
              {t.noOrdersYet}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{t.menuNameColumn}</th>
                    <th>{t.unitPrice}</th>
                    <th>{t.quantity}</th>
                    <th>{t.discount}</th>
                    <th>{t.amount}</th>
                  </tr>
                </thead>
                <tbody className="font-bold">
                  {summary.map((row) => (
                    <tr
                      className="border-t border-slate-100"
                      key={`${row.menuItemId}-${row.isService ? "service" : "paid"}`}
                    >
                      <td className="py-3">
                        {row.isService ? `${t.servicePrefix} ${row.menuName}` : row.menuName}
                      </td>
                      <td>{formatMoney(row.unitPrice)}</td>
                      <td>{row.quantity}</td>
                      <td>{row.discount > 0 ? formatMoney(row.discount) : "-"}</td>
                      <td>{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 text-lg font-black">
                  <tr>
                    <td className="py-3" colSpan={4}>
                      {t.totalAmount}
                    </td>
                    <td>{formatMoney(total)}</td>
                  </tr>
                  <tr>
                    <td className="pb-3" colSpan={4}>
                      {t.discountAmount}
                    </td>
                    <td>{formatMoney(discountTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={onCancelItems} variant="secondary">
              {t.cancelOrderItems}
            </Button>
            <Button onClick={onServiceItems} variant="secondary">
              {t.serviceItems}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button disabled={!hasPayableItems} onClick={onPrepay} variant="secondary">
              {t.prepay}
            </Button>
            <Button disabled={!canPay} onClick={onPay}>
              {isFinalCheckout ? t.finishCheckout : t.pay}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black">{t.orderDashboard}</h3>
          <div className="grid gap-2">
            {orders.map((order) => (
              <button
                className="rounded-2xl bg-slate-50 p-3 text-left text-sm font-bold hover:bg-lime-50"
                key={order.id}
                onClick={() => onEditOrder(order)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-black">#{order.orderNumber}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs">
                    {orderTypeText(order.orderType, t)}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{t.orderedBy}: {order.orderedBy.name}</p>
                <p className="text-slate-500">{formatDateTime(order.updatedAt)}</p>
                <p className="mt-2 text-slate-700">{shortItemSummary(order)}</p>
              </button>
            ))}
            <button
              className="touch-target rounded-2xl border-2 border-dashed border-club-green bg-lime-50 px-4 py-4 text-sm font-black text-club-black hover:bg-club-acid"
              onClick={onAddOrder}
              type="button"
            >
              {t.addOrder}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black">{t.mappedPartyCards}</h3>
          <div className="grid gap-2">
            {mappedPartyCards.map((partyCard) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={partyCard.id}
              >
                <p className="text-xl font-black">{partyCard.code}</p>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {t.partyType}: {partyCard.type === "walkIn" ? t.walkIn : partyCard.type === "reservation" ? t.reservation : t.waitingManagement}
                </p>
                {partyCard.type === "reservation" ? (
                  <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
                    <p>
                      {t.reservationTime}: {partyCard.reservationTime}
                    </p>
                    {partyCard.guests.map((guest) => (
                      <div className="rounded-xl bg-white px-3 py-2" key={guest.id}>
                        <p>{guest.name}</p>
                        {guest.username ? (
                          <p className="text-xs text-slate-500">@{guest.username}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {partyCard.type === "waiting" ? (
                  <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
                    <p>
                      {t.waitingOrder}: {partyCard.waitingOrder}
                    </p>
                    {partyCard.guests.map((guest) => (
                      <div className="rounded-xl bg-white px-3 py-2" key={guest.id}>
                        <p>{guest.name}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-lg font-black">{t.timeManagement}</h3>
          <p className="text-sm font-bold text-slate-500">{t.remainingTime}</p>
          <p className="mb-3 text-4xl font-black">
            {formatRemainingTime(remainingMinutes, language)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => adjustVisitTime(table.sessionId, activeVisit.id, -10)}
              variant="secondary"
            >
              -10 min
            </Button>
            <Button onClick={() => adjustVisitTime(table.sessionId, activeVisit.id, 10)}>
              +10 min
            </Button>
          </div>
          {logs.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-xs font-bold text-slate-600">
              {logs.slice(-3).map((log) => (
                <li key={log.id}>{language === "ko" ? log.messageKo : log.messageEn}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function AddOrderView({
  onCancel,
  onComplete,
  table,
  visit,
}: {
  onCancel: () => void;
  onComplete: () => void;
  table: Table;
  visit: Visit;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const rawCategories = useMenuStore(
    (state) => state.categoriesBySession[table.sessionId] ?? EMPTY_CATEGORIES,
  );
  const items = useMenuStore(
    (state) => state.itemsBySession[table.sessionId] ?? EMPTY_MENU_ITEMS,
  );
  const createOrder = useOrderStore((state) => state.createOrder);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const categories = useMemo(
    () => [...rawCategories].sort((a, b) => a.order - b.order),
    [rawCategories],
  );
  const [activeCategoryId, setActiveCategoryId] = useState("");

  useEffect(() => {
    if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id);
  }, [activeCategoryId, categories]);

  const activeItems = items.filter(
    (item) => item.categoryId === activeCategoryId && item.isActive && item.nameKo.trim() && item.price > 0,
  );
  const selectedItems = items
    .filter((item) => (quantities[item.id] ?? 0) > 0)
    .map((item) => ({ item, quantity: quantities[item.id] }));
  const totalQuantity = selectedItems.reduce((sum, entry) => sum + entry.quantity, 0);

  function changeQuantity(itemId: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, (current[itemId] ?? 0) + delta),
    }));
  }

  async function confirmOrder() {
    const order = createOrder({
      sessionId: table.sessionId,
      visitId: visit.id,
      items: selectedItems.map(({ item, quantity }) => ({
        menuItemId: item.id,
        menuName: item.nameKo,
        unitPrice: item.price,
        quantity,
      })),
    });
    await printOrderSlip(order, { tableNumber: table.number });
    setConfirmOpen(false);
    onComplete();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
          {t.table} {table.number}
        </p>
        <h3 className="text-xl font-black">{t.addOrder}</h3>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
          {t.noMenuAvailable}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-black ${
                  activeCategoryId === category.id
                    ? "bg-club-acid text-club-black"
                    : "bg-slate-100 text-slate-700 hover:bg-lime-50"
                }`}
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                type="button"
              >
                {category.nameKo}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {activeItems.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                {t.noMenuItems}
              </p>
            ) : (
              activeItems.map((item) => (
                <MenuQuantityRow
                  item={item}
                  key={item.id}
                  onChange={changeQuantity}
                  quantity={quantities[item.id] ?? 0}
                />
              ))
            )}
          </div>
        </>
      )}

      <div className="sticky bottom-0 grid gap-3 bg-white pt-2 sm:grid-cols-2">
        <Button onClick={onCancel} variant="secondary">{t.cancelOrder}</Button>
        <Button disabled={totalQuantity === 0} onClick={() => setConfirmOpen(true)}>
          {t.completeOrder}
        </Button>
      </div>

      <Modal onClose={() => setConfirmOpen(false)} open={confirmOpen} title={t.confirmOrderTitle}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            {selectedItems.map(({ item, quantity }) => (
              <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold" key={item.id}>
                <span>{item.nameKo} x {quantity}</span>
                <span>{formatMoney(item.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={confirmOrder}>{t.confirmOrder}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EditOrderView({
  onCancel,
  onComplete,
  order,
  table,
  visit,
}: {
  onCancel: () => void;
  onComplete: () => void;
  order: Order;
  table: Table;
  visit: Visit;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const rawCategories = useMenuStore(
    (state) => state.categoriesBySession[table.sessionId] ?? EMPTY_CATEGORIES,
  );
  const items = useMenuStore(
    (state) => state.itemsBySession[table.sessionId] ?? EMPTY_MENU_ITEMS,
  );
  const editOrderItems = useOrderStore((state) => state.editOrderItems);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    order.items.reduce<Record<string, number>>((next, item) => {
      next[item.menuItemId] = (next[item.menuItemId] ?? 0) + item.quantity;
      return next;
    }, {}),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const categories = useMemo(
    () => [...rawCategories].sort((a, b) => a.order - b.order),
    [rawCategories],
  );
  const [activeCategoryId, setActiveCategoryId] = useState("");

  useEffect(() => {
    if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id);
  }, [activeCategoryId, categories]);

  const activeItems = items.filter(
    (item) =>
      item.categoryId === activeCategoryId &&
      item.isActive &&
      item.nameKo.trim() &&
      item.price > 0,
  );
  const selectedItems = items
    .filter((item) => (quantities[item.id] ?? 0) > 0)
    .map((item) => ({ item, quantity: quantities[item.id] }));
  const totalQuantity = selectedItems.reduce((sum, entry) => sum + entry.quantity, 0);

  function changeQuantity(itemId: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, (current[itemId] ?? 0) + delta),
    }));
  }

  async function confirmEdit() {
    const edited = editOrderItems(
      order.id,
      selectedItems.map(({ item, quantity }) => ({
        menuItemId: item.id,
        menuName: item.nameKo,
        unitPrice: item.price,
        quantity,
      })),
    );
    if (edited) await printOrderSlip(edited, { tableNumber: table.number });
    setConfirmOpen(false);
    onComplete();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
          {t.table} {table.number}
        </p>
        <h3 className="text-xl font-black">
          {t.editOrder} #{order.orderNumber}
        </h3>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
          {t.noMenuAvailable}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-black ${
                  activeCategoryId === category.id
                    ? "bg-club-acid text-club-black"
                    : "bg-slate-100 text-slate-700 hover:bg-lime-50"
                }`}
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                type="button"
              >
                {category.nameKo}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {activeItems.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                {t.noMenuItems}
              </p>
            ) : (
              activeItems.map((item) => (
                <MenuQuantityRow
                  item={item}
                  key={item.id}
                  onChange={changeQuantity}
                  quantity={quantities[item.id] ?? 0}
                />
              ))
            )}
          </div>
        </>
      )}

      <div className="sticky bottom-0 grid gap-3 bg-white pt-2 sm:grid-cols-2">
        <Button onClick={onCancel} variant="secondary">
          {t.cancelOrder}
        </Button>
        <Button disabled={totalQuantity === 0} onClick={() => setConfirmOpen(true)}>
          {t.completeOrder}
        </Button>
      </div>

      <Modal onClose={() => setConfirmOpen(false)} open={confirmOpen} title={t.confirmOrderTitle}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            {selectedItems.map(({ item, quantity }) => (
              <div
                className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"
                key={item.id}
              >
                <span>
                  {item.nameKo} x {quantity}
                </span>
                <span>{formatMoney(item.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={confirmEdit}>{t.confirmOrder}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdjustmentView({
  kind,
  onCancel,
  onComplete,
  table,
  visit,
}: {
  kind: "cancel" | "service";
  onCancel: () => void;
  onComplete: () => void;
  table: Table;
  visit: Visit;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const allOrders = useOrderStore(
    (state) => state.ordersBySession[table.sessionId] ?? EMPTY_ORDERS,
  );
  const cancelOrderItems = useOrderStore((state) => state.cancelOrderItems);
  const serviceOrderItems = useOrderStore((state) => state.serviceOrderItems);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const orders = useMemo(
    () =>
      allOrders
        .filter((order) => order.visitId === visit.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [allOrders, visit.id],
  );
  const rows = useMemo(() => buildAdjustmentRows(orders, kind), [kind, orders]);
  const selectedRows = rows
    .map((row) => ({ ...row, quantity: quantities[row.menuItemId] ?? 0 }))
    .filter((row) => row.quantity > 0);
  const totalQuantity = selectedRows.reduce((sum, row) => sum + row.quantity, 0);

  function changeQuantity(menuItemId: string, delta: number) {
    const row = rows.find((item) => item.menuItemId === menuItemId);
    if (!row) return;
    setQuantities((current) => ({
      ...current,
      [menuItemId]: Math.min(row.availableQuantity, Math.max(0, (current[menuItemId] ?? 0) + delta)),
    }));
  }

  function setDirectQuantity(menuItemId: string, value: string) {
    const row = rows.find((item) => item.menuItemId === menuItemId);
    if (!row) return;
    const nextValue = Number.parseInt(value, 10);
    const nextQuantity = Number.isFinite(nextValue) ? nextValue : 0;
    setQuantities((current) => ({
      ...current,
      [menuItemId]: Math.min(row.availableQuantity, Math.max(0, nextQuantity)),
    }));
  }

  async function confirmAdjustment() {
    const payload = selectedRows.reduce<Record<string, number>>((next, row) => {
      next[row.menuItemId] = row.quantity;
      return next;
    }, {});
    const affectedOrders =
      kind === "cancel"
        ? cancelOrderItems(table.sessionId, visit.id, payload)
        : serviceOrderItems(table.sessionId, visit.id, payload);
    if (kind === "cancel") {
      await Promise.all(
        affectedOrders.map((order) => printOrderSlip(order, { tableNumber: table.number })),
      );
    }
    setConfirmOpen(false);
    onComplete();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
          {t.table} {table.number}
        </p>
        <h3 className="text-xl font-black">
          {kind === "cancel" ? t.cancelOrderItems : t.serviceItems}
        </h3>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
          {t.noOrdersYet}
        </p>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <AdjustmentQuantityRow
              key={row.menuItemId}
              label={kind === "cancel" ? t.cancelQuantity : t.serviceQuantity}
              onChange={(delta) => changeQuantity(row.menuItemId, delta)}
              onDirectChange={(value) => setDirectQuantity(row.menuItemId, value)}
              quantity={quantities[row.menuItemId] ?? 0}
              row={row}
              t={t}
            />
          ))}
        </div>
      )}

      <div className="sticky bottom-0 grid gap-3 bg-white pt-2 sm:grid-cols-2">
        <Button onClick={onCancel} variant="secondary">
          {t.cancelOrder}
        </Button>
        <Button disabled={totalQuantity === 0} onClick={() => setConfirmOpen(true)}>
          {kind === "cancel" ? t.completeCancel : t.completeService}
        </Button>
      </div>

      <Modal
        onClose={() => setConfirmOpen(false)}
        open={confirmOpen}
        title={kind === "cancel" ? t.confirmCancelTitle : t.confirmServiceTitle}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            {selectedRows.map((row) => (
              <div
                className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold"
                key={row.menuItemId}
              >
                <span>
                  {row.menuName} x {row.quantity}
                </span>
                <span>{formatMoney(row.unitPrice * row.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={confirmAdjustment}>
              {kind === "cancel" ? t.completeCancel : t.completeService}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type PayableRow = {
  menuItemId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  discountAmount: number;
  isService?: boolean;
};

function PaymentView({
  isPrepaid,
  onBack,
  onClosePanel,
  table,
  visit,
}: {
  isPrepaid: boolean;
  onBack: () => void;
  onClosePanel: () => void;
  table: Table;
  visit: Visit;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const allOrders = useOrderStore(
    (state) => state.ordersBySession[table.sessionId] ?? EMPTY_ORDERS,
  );
  const payments = usePaymentStore(
    (state) => state.paymentsBySession[table.sessionId] ?? EMPTY_PAYMENTS,
  );
  const markPayableItemsPaid = useOrderStore((state) => state.markPayableItemsPaid);
  const createPayment = usePaymentStore((state) => state.createPayment);
  const updateTable = useTableStore((state) => state.updateTable);
  const sessionTables = useTableStore(
    (state) => state.tablesBySession[table.sessionId] ?? EMPTY_TABLES,
  );
  const updateVisitStatus = useVisitStore((state) => state.updateVisitStatus);
  const [peopleCount, setPeopleCount] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const orders = useMemo(
    () => allOrders.filter((order) => order.visitId === visit.id),
    [allOrders, visit.id],
  );
  const rows = useMemo(() => buildPayableRows(orders), [orders]);
  const paymentItems = rows.filter((row) => !row.isService && row.quantity > 0);
  const totalAmount = paymentItems.reduce((sum, row) => sum + row.amount, 0);
  const discountAmount = rows.reduce((sum, row) => sum + row.discountAmount, 0);
  const perPersonAmount = Math.floor(totalAmount / Math.max(1, peopleCount));
  const hasPreviousPayment = payments.some(
    (payment) => payment.visitId === visit.id && payment.status === "paid",
  );
  const isCheckoutOnly = !isPrepaid && totalAmount === 0 && hasPreviousPayment && orders.length > 0;
  const tableLabel = getVisitTableLabel(visit, sessionTables, table);

  function updatePeopleCount(value: string) {
    const nextValue = Number.parseInt(value, 10);
    setPeopleCount(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
  }

  function completePayment() {
    if (isCheckoutOnly) {
      setConfirmOpen(false);
      updateVisitStatus(table.sessionId, visit.id, "cleaning");
      visit.tableIds.forEach((tableId) => updateTable(tableId, { status: "cleaning" }));
      onClosePanel();
      return;
    }

    const allocation = rows.reduce<Record<string, number>>((next, item) => {
      next[item.menuItemId] = item.quantity;
      return next;
    }, {});
    createPayment({
      sessionId: table.sessionId,
      visitId: visit.id,
      tableLabel: `${t.table} ${tableLabel}`,
      items: paymentItems.map((item) => ({
        menuItemId: item.menuItemId,
        menuName: item.menuName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        amount: item.amount,
      })),
      totalAmount,
      discountAmount,
      isPrepaid,
    });
    markPayableItemsPaid(table.sessionId, visit.id, allocation);
    setConfirmOpen(false);

    if (isPrepaid) {
      onBack();
      return;
    }

    updateVisitStatus(table.sessionId, visit.id, "cleaning");
    visit.tableIds.forEach((tableId) => updateTable(tableId, { status: "cleaning" }));
    onClosePanel();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
          {t.table} {tableLabel}
        </p>
        <h3 className="text-xl font-black">
          {isCheckoutOnly ? t.finishCheckout : isPrepaid ? t.prepayment : t.payment}
        </h3>
      </div>

      {isCheckoutOnly ? (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-base font-black text-slate-700">{t.finalCheckoutMessage}</p>
          <div className="grid gap-2 text-lg font-black sm:grid-cols-2">
            <p>
              {t.totalAmount}: {formatMoney(0)}
            </p>
            <p>
              {t.discountAmount}: {formatMoney(0)}
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black">{t.paymentItems}</h3>
          <div className="grid gap-2">
            {rows.map((row) => (
              <div
                className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"
                key={`${row.menuItemId}-${row.isService ? "service" : "paid"}`}
              >
                <span>
                  {row.isService ? `${t.servicePrefix} ${row.menuName}` : row.menuName} x{" "}
                  {row.quantity}
                </span>
                <span>{formatMoney(row.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isCheckoutOnly ? (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 text-lg font-black sm:grid-cols-2">
            <p>
              {t.totalAmount}: {formatMoney(totalAmount)}
            </p>
            <p>
              {t.discountAmount}: {formatMoney(discountAmount)}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-600 sm:max-w-xs">
            {t.paymentPeopleCount}
            <input
              className="touch-target rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-club-green"
              min={1}
              onChange={(event) => updatePeopleCount(event.target.value)}
              type="number"
              value={peopleCount}
            />
          </label>
          {peopleCount >= 2 ? (
            <p className="text-lg font-black">
              {t.perPersonAmount}: {formatMoney(perPersonAmount)}
            </p>
          ) : null}
          <p className="rounded-2xl bg-white p-4 text-center text-base font-black text-club-green">
            {t.confirmDeposit}
          </p>
        </section>
      ) : null}

      <div className="sticky bottom-0 grid gap-3 bg-white pt-2 sm:grid-cols-2">
        <Button onClick={onBack} variant="secondary">
          {t.back}
        </Button>
        <Button disabled={!isCheckoutOnly && totalAmount <= 0} onClick={() => setConfirmOpen(true)}>
          {isCheckoutOnly ? t.completeCheckout : isPrepaid ? t.completePrepayment : t.completePayment}
        </Button>
      </div>

      <Modal
        onClose={() => setConfirmOpen(false)}
        open={confirmOpen}
        title={isCheckoutOnly ? t.confirmCheckoutTitle : t.confirmPaymentTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">
            {isCheckoutOnly ? t.confirmCheckoutPrompt : t.confirmPaymentPrompt}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setConfirmOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button onClick={completePayment}>
              {isCheckoutOnly ? t.completeCheckout : isPrepaid ? t.completePrepayment : t.completePayment}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function buildPayableRows(orders: Order[]) {
  const rows = new Map<string, PayableRow>();

  orders
    .flatMap((order) => order.items)
    .forEach((item) => {
      const paidQuantity = item.paidQuantity ?? 0;
      const activeQuantity = Math.max(0, item.quantity - item.cancelledQuantity - paidQuantity);
      const serviceQuantity = Math.min(item.serviceQuantity, activeQuantity);
      const payableQuantity = activeQuantity - serviceQuantity;

      if (payableQuantity > 0) {
        const key = `${item.menuItemId}:paid`;
        const current = rows.get(key);
        rows.set(key, {
          menuItemId: item.menuItemId,
          menuName: item.menuName,
          unitPrice: item.unitPrice,
          quantity: (current?.quantity ?? 0) + payableQuantity,
          amount: (current?.amount ?? 0) + payableQuantity * item.unitPrice,
          discountAmount: current?.discountAmount ?? 0,
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
          amount: 0,
          discountAmount: (current?.discountAmount ?? 0) + serviceQuantity * item.unitPrice,
          isService: true,
        });
      }
    });

  return [...rows.values()];
}

type AdjustmentRow = {
  menuItemId: string;
  menuName: string;
  unitPrice: number;
  availableQuantity: number;
  orderNumbers: number[];
};

function buildAdjustmentRows(orders: Order[], kind: "cancel" | "service") {
  const rows = new Map<string, AdjustmentRow>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const availableQuantity =
        kind === "cancel"
          ? item.quantity - item.cancelledQuantity - (item.paidQuantity ?? 0)
          : item.quantity -
            item.cancelledQuantity -
            item.serviceQuantity -
            (item.paidQuantity ?? 0);
      if (availableQuantity <= 0) return;

      const current = rows.get(item.menuItemId);
      rows.set(item.menuItemId, {
        menuItemId: item.menuItemId,
        menuName: item.menuName,
        unitPrice: item.unitPrice,
        availableQuantity: (current?.availableQuantity ?? 0) + availableQuantity,
        orderNumbers: current
          ? [...new Set([...current.orderNumbers, order.orderNumber])]
          : [order.orderNumber],
      });
    });
  });

  return [...rows.values()];
}

function AdjustmentQuantityRow({
  label,
  onChange,
  onDirectChange,
  quantity,
  row,
  t,
}: {
  label: string;
  onChange: (delta: number) => void;
  onDirectChange: (value: string) => void;
  quantity: number;
  row: AdjustmentRow;
  t: ReturnType<typeof getDictionary>;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-lg font-black">{row.menuName}</p>
        <p className="text-sm font-bold text-slate-500">
          {t.availableQuantity}: {row.availableQuantity} · {t.affectedOrders}:{" "}
          {row.orderNumbers.map((number) => `#${number}`).join(", ")}
        </p>
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <button
            className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 font-black hover:bg-lime-50 disabled:opacity-40"
            disabled={quantity <= 0}
            onClick={() => onChange(-1)}
            type="button"
          >
            <Minus size={18} />
          </button>
          <input
            className="h-11 w-16 rounded-xl border border-slate-200 text-center text-lg font-black"
            max={row.availableQuantity}
            min={0}
            onChange={(event) => onDirectChange(event.target.value)}
            type="number"
            value={quantity}
          />
          <button
            className="grid h-11 w-11 place-items-center rounded-xl bg-club-acid font-black hover:bg-club-lime disabled:opacity-40"
            disabled={quantity >= row.availableQuantity}
            onClick={() => onChange(1)}
            type="button"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuQuantityRow({
  item,
  onChange,
  quantity,
}: {
  item: MenuItem;
  quantity: number;
  onChange: (itemId: string, delta: number) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div>
        <p className="font-black">{item.nameKo}</p>
        <p className="text-sm font-bold text-slate-500">{formatMoney(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 font-black hover:bg-lime-50"
          onClick={() => onChange(item.id, -1)}
          type="button"
        >
          <Minus size={18} />
        </button>
        <span className="w-8 text-center text-lg font-black">{quantity}</span>
        <button
          className="grid h-10 w-10 place-items-center rounded-xl bg-club-acid font-black hover:bg-club-lime"
          onClick={() => onChange(item.id, 1)}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function getVisitTableLabel(visit: Visit, tables: Table[], fallback: Table) {
  const labels = visit.tableIds
    .map((tableId) => tables.find((table) => table.id === tableId)?.number)
    .filter((number): number is string => Boolean(number));
  if (labels.length === 0) return fallback.number;
  return labels.join("+");
}

function formatRemainingTime(minutes: number, language: "ko" | "en") {
  if (minutes <= 0) return language === "ko" ? "시간 초과" : "Expired";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function orderTypeText(orderType: Order["orderType"], t: ReturnType<typeof getDictionary>) {
  if (orderType === "initial") return t.initialOrder;
  if (orderType === "additional") return t.additionalOrder;
  return t.modifiedOrder;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortItemSummary(order: Order) {
  return order.items
    .filter((item) => item.quantity - item.cancelledQuantity > 0)
    .map((item) => `${item.menuName} x ${item.quantity - item.cancelledQuantity}`)
    .join(", ");
}
