"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { MenuSettingsModal } from "@/components/pos/MenuSettingsModal";
import { OrderPanel } from "@/components/pos/OrderPanel";
import { PosToolbar } from "@/components/pos/PosToolbar";
import { RightSidebar } from "@/components/pos/RightSidebar";
import { SalesReportModal } from "@/components/pos/SalesReportModal";
import { TableCanvas } from "@/components/pos/TableCanvas";
import { TableEditActionBar } from "@/components/pos/TableEditActionBar";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { useAppStore } from "@/stores/useAppStore";
import { useTableStore } from "@/stores/useTableStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { usePaymentStore } from "@/stores/usePaymentStore";
import { useReservationStore } from "@/stores/useReservationStore";
import { useVisitStore } from "@/stores/useVisitStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Table } from "@/types";

type PosWorkspaceProps = {
  sessionId: string;
};

const EMPTY_TABLES: Table[] = [];

export type TableModalState =
  | { type: "none" }
  | { type: "capacity"; x: number; y: number }
  | { type: "message"; title: string; body: string }
  | { type: "walkInConfirm"; table: Table }
  | { type: "cleaningConfirm"; table: Table }
  | { type: "order"; table: Table }
  | { type: "deleteConfirm"; tables: Table[] };

export function PosWorkspace({ sessionId }: PosWorkspaceProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadTables = useTableStore((state) => state.loadTables);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const selectedTableIds = useTableStore((state) => state.selectedTableIds);
  const deleteTables = useTableStore((state) => state.deleteTables);
  const updateTable = useTableStore((state) => state.updateTable);
  const clearSelection = useTableStore((state) => state.clearSelection);
  const restoreMoveSnapshot = useTableStore((state) => state.restoreMoveSnapshot);
  const clearMoveSnapshot = useTableStore((state) => state.clearMoveSnapshot);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const tableEditMode = useWorkspaceStore((state) => state.tableEditMode);
  const setTableEditMode = useWorkspaceStore((state) => state.setTableEditMode);
  const loadCapacityPreset = useWorkspaceStore((state) => state.loadCapacityPreset);
  const resetWorkspaceMode = useWorkspaceStore((state) => state.resetWorkspaceMode);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loadPayments = usePaymentStore((state) => state.loadPayments);
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const createWalkInVisit = useVisitStore((state) => state.createWalkInVisit);
  const getActiveVisitForTable = useVisitStore((state) => state.getActiveVisitForTable);
  const getPartyCard = useVisitStore((state) => state.getPartyCard);
  const assignPartyCardToTable = useVisitStore((state) => state.assignPartyCardToTable);
  const completeVisitsForTable = useVisitStore((state) => state.completeVisitsForTable);
  const loadReservationSource = useReservationStore((state) => state.loadReservationSource);
  const selectedPartyCardId = useReservationStore(
    (state) => state.selectedPartyCardIdBySession[sessionId],
  );
  const selectPartyCardForAssignment = useReservationStore(
    (state) => state.selectPartyCardForAssignment,
  );
  const [modal, setModal] = useState<TableModalState>({ type: "none" });
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false);
  const [salesReportOpen, setSalesReportOpen] = useState(false);

  useEffect(() => {
    loadTables(sessionId);
    loadMenu(sessionId);
    loadOrders(sessionId);
    loadPayments(sessionId);
    loadVisits(sessionId);
    loadReservationSource(sessionId);
    loadCapacityPreset();
    clearSelection();
    resetWorkspaceMode();
  }, [
    clearSelection,
    loadCapacityPreset,
    loadMenu,
    loadOrders,
    loadPayments,
    loadReservationSource,
    loadTables,
    loadVisits,
    resetWorkspaceMode,
    sessionId,
  ]);

  useEffect(
    () =>
      subscribeClubxSync((payload) => {
        if (payload.sessionId && payload.sessionId !== sessionId) return;
        if (payload.store === "tables") loadTables(sessionId);
        if (payload.store === "menu") loadMenu(sessionId);
        if (payload.store === "orders") loadOrders(sessionId);
        if (payload.store === "visits") loadVisits(sessionId);
        if (payload.store === "payments") loadPayments(sessionId);
        if (payload.store === "reservations") loadReservationSource(sessionId);
      }),
    [loadMenu, loadOrders, loadPayments, loadReservationSource, loadTables, loadVisits, sessionId],
  );

  const selectedTables = useMemo(
    () => tables.filter((table) => selectedTableIds.includes(table.id)),
    [selectedTableIds, tables],
  );

  const hasDuplicateNumbers = useMemo(() => {
    const normalized = tables.map((table) => table.number.trim()).filter(Boolean);
    return new Set(normalized).size !== normalized.length;
  }, [tables]);

  function closeModal() {
    setModal({ type: "none" });
  }

  function finishMode() {
    if (tableEditMode === "delete" && selectedTables.length > 0) {
      setModal({ type: "deleteConfirm", tables: selectedTables });
      return;
    }

    clearSelection();
    if (tableEditMode === "move") clearMoveSnapshot(sessionId);
    setTableEditMode("idle");
  }

  function cancelMode() {
    if (tableEditMode === "move") restoreMoveSnapshot(sessionId);
    clearSelection();
    setTableEditMode("idle");
  }

  function confirmDelete() {
    if (modal.type !== "deleteConfirm") return;
    deleteTables(modal.tables.map((table) => table.id));
    clearSelection();
    closeModal();
    setTableEditMode("idle");
  }

  function confirmWalkIn(table: Table) {
    createWalkInVisit(sessionId, table.id);
    updateTable(table.id, { status: "occupied" });
    setModal({ type: "order", table: { ...table, status: "occupied" } });
  }

  function confirmCleaned(table: Table) {
    completeVisitsForTable(sessionId, table.id);
    updateTable(table.id, { status: "empty" });
    closeModal();
  }

  function assignSelectedPartyCard(table: Table) {
    if (!selectedPartyCardId) return false;
    const partyCard = getPartyCard(sessionId, selectedPartyCardId);
    if (partyCard && partyCard.guests.length > table.maxCapacity) {
      setModal({
        type: "message",
        title: t.assignToTable,
        body: t.partyExceedsTableCapacity,
      });
      return true;
    }
    const visit = assignPartyCardToTable(sessionId, selectedPartyCardId, table.id);
    if (!visit) return false;
    const occupiedTable = { ...table, status: "occupied" as const };
    updateTable(table.id, { status: "occupied" });
    selectPartyCardForAssignment(sessionId, null);
    setModal({ type: "order", table: occupiedTable });
    return true;
  }

  const orderTable = modal.type === "order" ? modal.table : null;
  const activeVisit = orderTable
    ? getActiveVisitForTable(sessionId, orderTable.id) ?? null
    : null;
  const activePartyCard = activeVisit?.partyCardIds[0]
    ? getPartyCard(sessionId, activeVisit.partyCardIds[0]) ?? null
    : null;

  return (
    <main
      className={`grid min-h-screen bg-[#f7f8f2] text-club-ink transition-[grid-template-columns] ${
        sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_0px]"
      }`}
    >
      <section className="grid min-h-screen min-w-0 grid-rows-[76px_minmax(0,1fr)]">
        <PosToolbar
          onOpenMenuSettings={() => setMenuSettingsOpen(true)}
          onOpenSalesReport={() => setSalesReportOpen(true)}
          sessionId={sessionId}
        />
        <TableCanvas
          hasDuplicateNumbers={hasDuplicateNumbers}
          onAssignSelectedPartyCard={assignSelectedPartyCard}
          onOpenModal={setModal}
          sessionId={sessionId}
        />
      </section>
      <RightSidebar sessionId={sessionId} />

      <TableEditActionBar
        disabled={tableEditMode === "number" && hasDuplicateNumbers}
        hasDuplicateNumbers={hasDuplicateNumbers}
        onCancel={cancelMode}
        onDone={finishMode}
        selectedCount={selectedTables.length}
      />

      <CapacityModal modal={modal} onClose={closeModal} sessionId={sessionId} />
      <MenuSettingsModal
        onClose={() => setMenuSettingsOpen(false)}
        open={menuSettingsOpen}
        sessionId={sessionId}
      />
      <SalesReportModal
        onClose={() => setSalesReportOpen(false)}
        open={salesReportOpen}
        sessionId={sessionId}
      />

      <Modal onClose={closeModal} open={modal.type === "message"} title={modal.type === "message" ? modal.title : ""}>
        {modal.type === "message" ? (
          <p className="text-sm font-semibold text-slate-600">{modal.body}</p>
        ) : null}
      </Modal>

      <OrderPanel
        onClose={closeModal}
        open={modal.type === "order"}
        partyCard={activePartyCard}
        table={orderTable}
        visit={activeVisit}
      />

      <Modal
        onClose={closeModal}
        open={modal.type === "walkInConfirm"}
        title={t.createWalkInTitle}
      >
        {modal.type === "walkInConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {t.createWalkInPrompt}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={() => confirmWalkIn(modal.table)}>
                {t.createWalkIn}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "cleaningConfirm"}
        title={t.markCleanedTitle}
      >
        {modal.type === "cleaningConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {t.markCleanedPrompt}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={() => confirmCleaned(modal.table)}>
                {t.markCleaned}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "deleteConfirm"}
        title={t.confirmDeleteTables}
      >
        {modal.type === "deleteConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {modal.tables.map((table) => `${t.table} ${table.number}`).join(", ")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="touch-target rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
                onClick={closeModal}
                type="button"
              >
                {t.cancel}
              </button>
              <button
                className="touch-target rounded-2xl bg-club-red px-5 py-3 text-sm font-black text-white"
                onClick={confirmDelete}
                type="button"
              >
                {t.deleteSelected}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

function CapacityModal({
  modal,
  onClose,
  sessionId,
}: {
  modal: TableModalState;
  onClose: () => void;
  sessionId: string;
}) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const addTable = useTableStore((state) => state.addTable);
  const lastTableCapacityPreset = useWorkspaceStore(
    (state) => state.lastTableCapacityPreset,
  );
  const setLastTableCapacityPreset = useWorkspaceStore(
    (state) => state.setLastTableCapacityPreset,
  );

  if (modal.type !== "capacity") {
    return null;
  }

  return (
    <Modal onClose={onClose} open title={t.tableCapacity}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const minCapacity = Number(form.get("minCapacity") ?? 1);
          const maxCapacity = Number(form.get("maxCapacity") ?? minCapacity);
          const normalizedMin = Math.max(1, minCapacity);
          const normalizedMax = Math.max(normalizedMin, maxCapacity);

          setLastTableCapacityPreset({
            minCapacity: normalizedMin,
            maxCapacity: normalizedMax,
          });

          addTable({
            sessionId,
            minCapacity: normalizedMin,
            maxCapacity: normalizedMax,
            x: modal.x,
            y: modal.y,
          });
          onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            {t.minCapacity}
            <input
              className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
              defaultValue={lastTableCapacityPreset.minCapacity}
              min={1}
              name="minCapacity"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-600">
            {t.maxCapacity}
            <input
              className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
              defaultValue={lastTableCapacityPreset.maxCapacity}
              min={1}
              name="maxCapacity"
              type="number"
            />
          </label>
        </div>
        <div className="rounded-2xl bg-lime-50 p-4 text-sm font-semibold text-slate-700">
          Size 1: 1-2 people · Size 2: 3-5 people · Size 3: 6+ people
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="touch-target rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
            onClick={onClose}
            type="button"
          >
            {t.cancel}
          </button>
          <button
            className="touch-target rounded-2xl bg-club-acid px-5 py-3 text-sm font-black text-club-black"
            type="submit"
          >
            {t.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}
