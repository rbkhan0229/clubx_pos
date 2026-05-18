"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { printOrderSlip } from "@/lib/mock/printOrderSlip";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/stores/useAppStore";
import { useHandyStore } from "@/stores/useHandyStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { tableStatusLabel, useTableStore } from "@/stores/useTableStore";
import { useVisitStore } from "@/stores/useVisitStore";
import type { MenuCategory, MenuItem, Order, StaffDevice, Table, TableMergeGroup, Visit } from "@/types";

const EMPTY_CATEGORIES: MenuCategory[] = [];
const EMPTY_ITEMS: MenuItem[] = [];
const EMPTY_ORDERS: Order[] = [];
const EMPTY_TABLES: Table[] = [];
const EMPTY_MERGE_GROUPS: TableMergeGroup[] = [];
const EMPTY_DEVICES: StaffDevice[] = [];

type HandyMode =
  | { type: "tables" }
  | { type: "order"; table: Table }
  | { type: "complete"; table: Table; order: Order };

const tableSizeClass = {
  1: "h-20 w-24",
  2: "h-24 w-32",
  3: "h-28 w-40",
};

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
  const devices = useHandyStore((state) => state.devicesBySession[sessionId] ?? EMPTY_DEVICES);
  const clearHandyLogin = useHandyStore((state) => state.clearHandyLogin);
  const loadTables = useTableStore((state) => state.loadTables);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const mergeGroups = useTableStore(
    (state) => state.mergeGroupsBySession[sessionId] ?? EMPTY_MERGE_GROUPS,
  );
  const updateTable = useTableStore((state) => state.updateTable);
  const getMergeGroupByTableId = useTableStore((state) => state.getMergeGroupByTableId);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const completeVisitsForTable = useVisitStore((state) => state.completeVisitsForTable);
  const [mode, setMode] = useState<HandyMode>({ type: "tables" });
  const [cleaningTable, setCleaningTable] = useState<Table | null>(null);
  const [message, setMessage] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    loadHandyState();
    loadTables(sessionId);
    loadMenu(sessionId);
    loadOrders(sessionId);
    loadVisits(sessionId);
  }, [loadHandyState, loadMenu, loadOrders, loadTables, loadVisits, sessionId]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.sessionId && payload.sessionId !== sessionId) return;
        if (payload.store === "tables") loadTables(sessionId);
        if (payload.store === "menu") loadMenu(sessionId);
        if (payload.store === "orders") loadOrders(sessionId);
        if (payload.store === "visits") loadVisits(sessionId);
        if (payload.store === "handy") loadHandyState();
      }),
    [loadHandyState, loadMenu, loadOrders, loadTables, loadVisits, sessionId],
  );

  const activeDevice =
    handyLogin?.sessionId === sessionId
      ? devices.find((device) => device.id === handyLogin.deviceId)
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
    if (table.status === "empty") {
      setMessage(t.emptyTableCounterOnly);
      return;
    }
    setMode({ type: "order", table });
  }

  return (
    <HandyShell onLogout={() => setLogoutOpen(true)} staffName={handyLogin.staffName}>
      {mode.type === "tables" ? (
        <div className="grid gap-4">
          <header className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
              Handy Order
            </p>
            <h1 className="text-2xl font-black">Session: {sessionId}</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">{t.scrollCanvasHint}</p>
          </header>
          {message ? (
            <p className="rounded-2xl bg-white p-4 text-center text-sm font-black text-slate-600 shadow-sm">
              {message}
            </p>
          ) : null}
          <div className="max-h-[calc(100vh-190px)] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
            <div className="relative h-[920px] w-[1280px] bg-white">
            {mergeGroups.map((group) => {
              const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
              if (groupTables.length === 0) return null;
              const bounds = getGroupBounds(groupTables);
              return (
                <div
                  className="pointer-events-none absolute rounded-3xl border-4 border-dashed border-club-green/70 bg-lime-100/40"
                  key={group.id}
                  style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                  }}
                >
                  <div className="absolute left-3 top-2 rounded-full bg-white px-3 py-1 text-sm font-black text-club-black shadow-sm">
                    {group.label}
                  </div>
                </div>
              );
            })}
            {tables.map((table) => (
              <button
                className={cn(
                  "absolute grid place-items-center rounded-2xl border-2 p-3 text-center shadow-md transition active:scale-[0.98]",
                  tableSizeClass[table.size],
                  statusClass[table.status],
                  table.mergedGroupId && "border-dashed",
                  table.status === "empty" && "cursor-not-allowed opacity-85",
                )}
                key={table.id}
                onClick={() => handleTableClick(table)}
                style={{
                  left: table.x,
                  top: table.y,
                  transform: "translate(-50%, -50%)",
                }}
                type="button"
              >
                <span className="block text-2xl font-black">{table.number}</span>
                <span className="block text-xs font-black uppercase tracking-[0.12em] opacity-80">
                  {tableStatusLabel(table.status)}
                </span>
              </button>
            ))}
            </div>
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
                  const group = cleaningTable.mergedGroupId
                    ? getMergeGroupByTableId(sessionId, cleaningTable.id)
                    : null;
                  const tableIds = group?.tableIds ?? [cleaningTable.id];
                  tableIds.forEach((tableId) => completeVisitsForTable(sessionId, tableId));
                  tableIds.forEach((tableId) => updateTable(tableId, { status: "empty" }));
                }
                setCleaningTable(null);
              }}
            >
              {t.markCleaned}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal onClose={() => setLogoutOpen(false)} open={logoutOpen} title={t.handyLogoutTitle}>
        <div className="grid gap-4">
          <p className="text-sm font-bold text-slate-600">{t.handyLogoutPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => setLogoutOpen(false)} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                clearHandyLogin();
                router.push("/login");
              }}
            >
              {t.logout}
            </Button>
          </div>
        </div>
      </Modal>
    </HandyShell>
  );
}

function HandyShell({
  children,
  onLogout,
  staffName,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
  staffName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f2] p-4 text-club-ink">
      <div className="mx-auto grid max-w-3xl gap-4">
        {staffName ? (
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm">
            <span>ClubX Handy</span>
            <div className="flex items-center gap-3">
              <span>{staffName}</span>
              <button
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black"
                onClick={onLogout}
                type="button"
              >
                Logout
              </button>
            </div>
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
  const sessionTables = useTableStore((state) => state.tablesBySession[table.sessionId] ?? EMPTY_TABLES);
  const createOrder = useOrderStore((state) => state.createOrder);
  const getActiveVisitForTable = useVisitStore((state) => state.getActiveVisitForTable);
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
    const visit: Visit | undefined = getActiveVisitForTable(table.sessionId, table.id);
    if (!visit) {
      setConfirmOpen(false);
      return;
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
    await printOrderSlip(order, { tableNumber: getVisitTableLabel(visit, sessionTables, table) });
    setConfirmOpen(false);
    onComplete(order, table);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-club-green">
            {t.table} {getHandyTableLabel(table, sessionTables)}
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
  const sessionTables = useTableStore((state) => state.tablesBySession[table.sessionId] ?? EMPTY_TABLES);

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
          {t.table} {getHandyTableLabel(table, sessionTables)}
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

function getGroupBounds(tables: Table[]) {
  const points = tables.map((table) => {
    const width = table.size === 1 ? 96 : table.size === 2 ? 128 : 160;
    const height = table.size === 1 ? 80 : table.size === 2 ? 96 : 112;
    return {
      left: table.x - width / 2,
      right: table.x + width / 2,
      top: table.y - height / 2,
      bottom: table.y + height / 2,
    };
  });
  const left = Math.min(...points.map((point) => point.left)) - 10;
  const right = Math.max(...points.map((point) => point.right)) + 10;
  const top = Math.min(...points.map((point) => point.top)) - 10;
  const bottom = Math.max(...points.map((point) => point.bottom)) + 10;
  return { left, top, width: right - left, height: bottom - top };
}

function getHandyTableLabel(table: Table, tables: Table[]) {
  if (!table.mergedGroupId) return table.number;
  return tables
    .filter((item) => item.mergedGroupId === table.mergedGroupId)
    .map((item) => item.number)
    .join("+");
}

function getVisitTableLabel(visit: Visit, tables: Table[], fallback: Table) {
  const labels = visit.tableIds
    .map((tableId) => tables.find((table) => table.id === tableId)?.number)
    .filter((number): number is string => Boolean(number));
  return labels.length > 0 ? labels.join("+") : fallback.number;
}
