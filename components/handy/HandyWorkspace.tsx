"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { printOrderSlip } from "@/lib/mock/printOrderSlip";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { tableStatusLabel, useTableStore } from "@/stores/useTableStore";
import { useVisitStore } from "@/stores/useVisitStore";
import type { MenuCategory, MenuItem, Order, Table, Visit } from "@/types";

const EMPTY_CATEGORIES: MenuCategory[] = [];
const EMPTY_ITEMS: MenuItem[] = [];
const EMPTY_ORDERS: Order[] = [];

type HandyMode =
  | { type: "tables" }
  | { type: "order"; table: Table }
  | { type: "complete"; table: Table; order: Order };

const statusClass = {
  empty: "border-club-green bg-club-acid text-club-black",
  occupied: "border-club-black bg-club-black text-white",
  cleaning: "border-slate-400 bg-slate-300 text-club-ink",
};

export function HandyWorkspace({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadHandyState = useHandyStore((state) => state.loadHandyState);
  const handyLogin = useHandyStore((state) => state.handyLogin);
  const getDevice = useHandyStore((state) => state.getDevice);
  const clearHandyLogin = useHandyStore((state) => state.clearHandyLogin);
  const loadTables = useTableStore((state) => state.loadTables);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? []);
  const updateTable = useTableStore((state) => state.updateTable);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const completeVisitsForTable = useVisitStore((state) => state.completeVisitsForTable);
  const [mode, setMode] = useState<HandyMode>({ type: "tables" });
  const [cleaningTable, setCleaningTable] = useState<Table | null>(null);

  useEffect(() => {
    loadHandyState();
    loadTables(sessionId);
    loadMenu(sessionId);
    loadOrders(sessionId);
    loadVisits(sessionId);
  }, [loadHandyState, loadMenu, loadOrders, loadTables, loadVisits, sessionId]);

  const activeDevice =
    handyLogin?.sessionId === sessionId
      ? getDevice(sessionId, handyLogin.deviceId)
      : undefined;

  useEffect(() => {
    if (!handyLogin) return;
    if (handyLogin.sessionId !== sessionId || activeDevice?.status === "kicked") {
      clearHandyLogin();
      router.push("/login");
    }
  }, [activeDevice?.status, clearHandyLogin, handyLogin, router, sessionId]);

  if (!handyLogin || handyLogin.sessionId !== sessionId) {
    return (
      <HandyShell>
        <p className="rounded-2xl bg-white p-5 text-center font-black">{t.loginRequired}</p>
      </HandyShell>
    );
  }

  if (!activeDevice || activeDevice.status === "kicked") {
    return (
      <HandyShell>
        <p className="rounded-2xl bg-white p-5 text-center font-black text-club-red">
          {t.deviceKicked}
        </p>
      </HandyShell>
    );
  }

  function handleTableClick(table: Table) {
    if (table.status === "cleaning") {
      setCleaningTable(table);
      return;
    }
    setMode({ type: "order", table });
  }

  return (
    <HandyShell staffName={handyLogin.staffName}>
      {mode.type === "tables" ? (
        <div className="grid gap-4">
          <header className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
              Handy Order
            </p>
            <h1 className="text-2xl font-black">Session: {sessionId}</h1>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tables.map((table) => (
              <button
                className={cn(
                  "min-h-28 rounded-2xl border-2 p-4 text-center shadow-sm transition active:scale-[0.98]",
                  statusClass[table.status],
                )}
                key={table.id}
                onClick={() => handleTableClick(table)}
                type="button"
              >
                <span className="block text-3xl font-black">{table.number}</span>
                <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] opacity-80">
                  {tableStatusLabel(table.status)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : mode.type === "order" ? (
        <HandyAddOrder
          onCancel={() => setMode({ type: "tables" })}
          onComplete={(order, table) => setMode({ type: "complete", order, table })}
          staffName={handyLogin.staffName}
          table={mode.table}
        />
      ) : (
        <OrderComplete
          onBack={() => setMode({ type: "tables" })}
          order={mode.order}
          staffName={handyLogin.staffName}
          table={mode.table}
        />
      )}

      <Modal
        onClose={() => setCleaningTable(null)}
        open={Boolean(cleaningTable)}
        title={t.markCleanedTitle}
      >
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.markCleanedPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setCleaningTable(null)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (cleaningTable) {
                  completeVisitsForTable(sessionId, cleaningTable.id);
                  updateTable(cleaningTable.id, { status: "empty" });
                }
                setCleaningTable(null);
              }}
            >
              {t.markCleaned}
            </Button>
          </div>
        </div>
      </Modal>
    </HandyShell>
  );
}

function HandyShell({
  children,
  staffName,
}: {
  children: React.ReactNode;
  staffName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f2] p-4 text-club-ink">
      <div className="mx-auto grid max-w-3xl gap-4">
        {staffName ? (
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm">
            <span>ClubX Handy</span>
            <span>{staffName}</span>
          </div>
        ) : null}
        {children}
      </div>
    </main>
  );
}

function HandyAddOrder({
  onCancel,
  onComplete,
  staffName,
  table,
}: {
  onCancel: () => void;
  onComplete: (order: Order, table: Table) => void;
  staffName: string;
  table: Table;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const categories = useMenuStore(
    (state) => state.categoriesBySession[table.sessionId] ?? EMPTY_CATEGORIES,
  );
  const items = useMenuStore((state) => state.itemsBySession[table.sessionId] ?? EMPTY_ITEMS);
  const allOrders = useOrderStore(
    (state) => state.ordersBySession[table.sessionId] ?? EMPTY_ORDERS,
  );
  const createOrder = useOrderStore((state) => state.createOrder);
  const createWalkInVisit = useVisitStore((state) => state.createWalkInVisit);
  const getActiveVisitForTable = useVisitStore((state) => state.getActiveVisitForTable);
  const updateTable = useTableStore((state) => state.updateTable);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  );

  useEffect(() => {
    if (!activeCategoryId && orderedCategories[0]) setActiveCategoryId(orderedCategories[0].id);
  }, [activeCategoryId, orderedCategories]);

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
    let visit: Visit | undefined = getActiveVisitForTable(table.sessionId, table.id);
    if (!visit) {
      visit = createWalkInVisit(table.sessionId, table.id).visit;
      updateTable(table.id, { status: "occupied" });
    }
    const order = createOrder({
      sessionId: table.sessionId,
      visitId: visit.id,
      orderedBy: { type: "handy", name: staffName },
      items: selectedItems.map(({ item, quantity }) => ({
        menuItemId: item.id,
        menuName: item.nameKo,
        unitPrice: item.price,
        quantity,
      })),
    });
    await printOrderSlip(order, { tableNumber: table.number });
    setConfirmOpen(false);
    onComplete(order, { ...table, status: "occupied" });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            {t.table} {table.number}
          </p>
          <h1 className="text-2xl font-black">{t.addOrder}</h1>
        </div>
        <button
          aria-label={t.close}
          className="grid h-12 w-12 place-items-center rounded-full bg-slate-100"
          onClick={onCancel}
          type="button"
        >
          <X size={24} />
        </button>
      </div>

      {orderedCategories.length === 0 || items.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center font-black text-slate-500">
          {t.noMenuSet}
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {orderedCategories.map((category) => (
              <button
                className={`min-h-12 shrink-0 rounded-2xl px-4 text-sm font-black ${
                  activeCategoryId === category.id ? "bg-club-acid" : "bg-white"
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
            {activeItems.map((item) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
                key={item.id}
              >
                <div>
                  <p className="text-lg font-black">{item.nameKo}</p>
                  <p className="text-sm font-bold text-slate-500">{formatMoney(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <QtyButton disabled={(quantities[item.id] ?? 0) <= 0} onClick={() => changeQuantity(item.id, -1)}>
                    <Minus size={20} />
                  </QtyButton>
                  <span className="w-8 text-center text-xl font-black">{quantities[item.id] ?? 0}</span>
                  <QtyButton onClick={() => changeQuantity(item.id, 1)}>
                    <Plus size={20} />
                  </QtyButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-[#f7f8f2] py-3">
        <Button onClick={onCancel} variant="secondary">
          {t.cancel}
        </Button>
        <Button disabled={totalQuantity === 0} onClick={() => setConfirmOpen(true)}>
          {t.completeOrder}
        </Button>
      </div>

      <Modal onClose={() => setConfirmOpen(false)} open={confirmOpen} title={t.confirmOrderTitle}>
        <div className="grid gap-4">
          {selectedItems.map(({ item, quantity }) => (
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm font-bold" key={item.id}>
              <span>{item.nameKo} x {quantity}</span>
              <span>{formatMoney(item.price * quantity)}</span>
            </div>
          ))}
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

function OrderComplete({
  onBack,
  order,
  staffName,
  table,
}: {
  onBack: () => void;
  order: Order;
  staffName: string;
  table: Table;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);

  return (
    <section className="relative grid min-h-[70vh] place-items-center rounded-3xl bg-white p-6 text-center shadow-sm">
      <button
        aria-label={t.close}
        className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100"
        onClick={onBack}
        type="button"
      >
        <X size={24} />
      </button>
      <div>
        <p className="text-4xl font-black">{t.orderComplete}</p>
        <p className="mt-5 text-lg font-black">
          {t.table} {table.number}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-500">Order #{order.orderNumber}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">
          {t.orderedBy}: {staffName}
        </p>
        <Button className="mt-8" onClick={onBack}>
          {t.backToTables}
        </Button>
      </div>
    </section>
  );
}

function QtyButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="grid h-12 w-12 place-items-center rounded-2xl bg-club-acid font-black disabled:bg-slate-100 disabled:text-slate-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}
