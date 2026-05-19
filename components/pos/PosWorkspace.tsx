"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { SafeSection } from "@/components/common/SafeSection";
import { MenuSettingsModal } from "@/components/pos/MenuSettingsModal";
import { OrderPanel } from "@/components/pos/OrderPanel";
import { PosToolbar } from "@/components/pos/PosToolbar";
import { RightSidebar } from "@/components/pos/RightSidebar";
import { SalesReportModal } from "@/components/pos/SalesReportModal";
import { TableCanvas } from "@/components/pos/TableCanvas";
import { TableEditActionBar } from "@/components/pos/TableEditActionBar";
import { TableMergeActionBar } from "@/components/pos/TableMergeActionBar";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { subscribeClubxSync } from "@/lib/localSync";
import { resetClubxLocalData, sanitizeSessionLocalData } from "@/lib/localDataMaintenance";
import { useAppStore } from "@/stores/useAppStore";
import { useTableStore } from "@/stores/useTableStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { usePaymentStore } from "@/stores/usePaymentStore";
import { useReservationStore } from "@/stores/useReservationStore";
import { useVisitStore } from "@/stores/useVisitStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Order, PartyCard, Table, Visit } from "@/types";

type PosWorkspaceProps = {
  sessionId: string;
};

const EMPTY_TABLES: Table[] = [];
const EMPTY_ORDERS: Order[] = [];

export type TableModalState =
  | { type: "none" }
  | { type: "capacity"; x: number; y: number }
  | { type: "message"; title: string; body: string }
  | { type: "resetLocalDataConfirm" }
  | { type: "walkInConfirm"; table: Table; error?: string }
  | { type: "cleaningConfirm"; table: Table }
  | { type: "order"; table: Table }
  | { type: "mergeConfirm"; tables: Table[] }
  | { type: "splitConfirm"; groupId: string; label: string }
  | {
      type: "joinConfirm";
      table: Table;
      partyCard: PartyCard;
      visit: Visit;
      tableLabel: string;
      existingGuests: number;
      incomingGuests: number;
      totalGuests: number;
      capacity: number;
    }
  | {
      type: "moveJoinConfirm";
      table: Table;
      partyCards: PartyCard[];
      sourceVisit: Visit;
      targetVisit: Visit;
      sourceLabel: string;
      targetLabel: string;
      sourceTableIds: string[];
      targetTableIds: string[];
      existingGuests: number;
      incomingGuests: number;
      totalGuests: number;
      capacity: number;
    }
  | { type: "deleteConfirm"; tables: Table[] };

type PartyCardMoveState = {
  partyCards: PartyCard[];
  sourceVisit: Visit;
  sourceLabel: string;
};

export function PosWorkspace({ sessionId }: PosWorkspaceProps) {
  const language = useAppStore((state) => state.language);
  const t = getDictionary(language);
  const loadTables = useTableStore((state) => state.loadTables);
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const selectedTableIds = useTableStore((state) => state.selectedTableIds);
  const mergeSelectedTableIds = useTableStore((state) => state.mergeSelectedTableIds);
  const deleteTables = useTableStore((state) => state.deleteTables);
  const updateTable = useTableStore((state) => state.updateTable);
  const clearSelection = useTableStore((state) => state.clearSelection);
  const clearMergeSelection = useTableStore((state) => state.clearMergeSelection);
  const createMergeGroup = useTableStore((state) => state.createMergeGroup);
  const splitMergeGroup = useTableStore((state) => state.splitMergeGroup);
  const getMergeGroupByTableId = useTableStore((state) => state.getMergeGroupByTableId);
  const getMergedGroupCapacity = useTableStore((state) => state.getMergedGroupCapacity);
  const canMergeTables = useTableStore((state) => state.canMergeTables);
  const restoreMoveSnapshot = useTableStore((state) => state.restoreMoveSnapshot);
  const clearMoveSnapshot = useTableStore((state) => state.clearMoveSnapshot);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const tableEditMode = useWorkspaceStore((state) => state.tableEditMode);
  const setTableEditMode = useWorkspaceStore((state) => state.setTableEditMode);
  const setTableMergeMode = useWorkspaceStore((state) => state.setTableMergeMode);
  const loadCapacityPreset = useWorkspaceStore((state) => state.loadCapacityPreset);
  const resetWorkspaceMode = useWorkspaceStore((state) => state.resetWorkspaceMode);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const orders = useOrderStore((state) => state.ordersBySession[sessionId] ?? EMPTY_ORDERS);
  const loadPayments = usePaymentStore((state) => state.loadPayments);
  const loadVisits = useVisitStore((state) => state.loadVisits);
  const createWalkInVisit = useVisitStore((state) => state.createWalkInVisit);
  const getActiveVisitForTable = useVisitStore((state) => state.getActiveVisitForTable);
  const getPartyCard = useVisitStore((state) => state.getPartyCard);
  const assignPartyCardToTable = useVisitStore((state) => state.assignPartyCardToTable);
  const joinPartyCardToVisit = useVisitStore((state) => state.joinPartyCardToVisit);
  const movePartyCardToVisit = useVisitStore((state) => state.movePartyCardToVisit);
  const completeVisitsForTable = useVisitStore((state) => state.completeVisitsForTable);
  const updateVisitTableIds = useVisitStore((state) => state.updateVisitTableIds);
  const loadReservationSource = useReservationStore((state) => state.loadReservationSource);
  const selectedPartyCardId = useReservationStore(
    (state) => state.selectedPartyCardIdBySession[sessionId],
  );
  const selectPartyCardForAssignment = useReservationStore(
    (state) => state.selectPartyCardForAssignment,
  );
  const [modal, setModal] = useState<TableModalState>({ type: "none" });
  const [partyCardMove, setPartyCardMove] = useState<PartyCardMoveState | null>(null);
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false);
  const [salesReportOpen, setSalesReportOpen] = useState(false);

  useEffect(() => {
    sanitizeSessionLocalData(sessionId);
    loadTables(sessionId);
    loadMenu(sessionId);
    loadOrders(sessionId);
    loadPayments(sessionId);
    loadVisits(sessionId);
    loadReservationSource(sessionId);
    loadCapacityPreset();
    clearSelection();
    clearMergeSelection();
    resetWorkspaceMode();
  }, [
    clearSelection,
    clearMergeSelection,
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
  const mergeSelectedTables = useMemo(
    () => tables.filter((table) => mergeSelectedTableIds.includes(table.id)),
    [mergeSelectedTableIds, tables],
  );

  const hasDuplicateNumbers = useMemo(() => {
    const normalized = tables.map((table) => table.number.trim()).filter(Boolean);
    return new Set(normalized).size !== normalized.length;
  }, [tables]);

  function closeModal() {
    setModal({ type: "none" });
  }

  function cancelPartyCardMove() {
    setPartyCardMove(null);
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

  function cancelMergeMode() {
    clearMergeSelection();
    setTableMergeMode(false);
  }

  function requestMerge() {
    if (mergeSelectedTables.some((table) => table.status === "cleaning" || table.mergedGroupId)) {
      setModal({
        type: "message",
        title: t.mergeSelectedTablesTitle,
        body: t.onlyAdjacentEmptyTablesCanMerge,
      });
      return;
    }
    const occupiedTables = mergeSelectedTables.filter((table) => table.status === "occupied");
    if (
      occupiedTables.length > 1 &&
      occupiedTables.some((table) => {
        const visit = getActiveVisitForTable(sessionId, table.id);
        return visit ? getPayableAmountForVisit(orders, visit.id) > 0 : false;
      })
    ) {
      setModal({
        type: "message",
        title: t.mergeSelectedTablesTitle,
        body: t.prepayBeforeMergeOccupiedTables,
      });
      return;
    }
    if (!canMergeTables(sessionId, mergeSelectedTableIds)) {
      setModal({
        type: "message",
        title: t.mergeSelectedTablesTitle,
        body: t.selectedTablesNotAdjacent,
      });
      return;
    }
    setModal({ type: "mergeConfirm", tables: mergeSelectedTables });
  }

  function requestSplit() {
    const group = mergeSelectedTables[0]?.mergedGroupId
      ? getMergeGroupByTableId(sessionId, mergeSelectedTables[0].id)
      : null;
    if (group) {
      const groupTables = tables.filter((table) => group.tableIds.includes(table.id));
      const activeVisits = getActiveVisitsForTables(groupTables, (tableId) =>
        getActiveVisitForTable(sessionId, tableId),
      );
      const hasOrderHistory = activeVisits.some((visit) =>
        orders.some((order) => order.visitId === visit.id),
      );
      if (hasOrderHistory) {
        setModal({
          type: "message",
          title: t.splitMergedTableTitle,
          body: t.mergedTableHasOrdersCannotSplit,
        });
        return;
      }
    }
    if (group) setModal({ type: "splitConfirm", groupId: group.id, label: group.label });
  }

  function confirmMerge() {
    if (modal.type !== "mergeConfirm") return;
    const group = createMergeGroup(sessionId, modal.tables.map((table) => table.id));
    if (!group) {
      setModal({
        type: "message",
        title: t.mergeSelectedTablesTitle,
        body: t.onlyAdjacentEmptyTablesCanMerge,
      });
      return;
    }
    const occupiedTables = modal.tables.filter((table) => table.status === "occupied");
    const primaryVisit = occupiedTables[0]
      ? getActiveVisitForTable(sessionId, occupiedTables[0].id)
      : undefined;
    if (primaryVisit) {
      occupiedTables.slice(1).forEach((table) => {
        const sourceVisit = getActiveVisitForTable(sessionId, table.id);
        if (!sourceVisit || sourceVisit.id === primaryVisit.id) return;
        movePartyCardToVisit(
          sessionId,
          sourceVisit.id,
          primaryVisit.id,
          sourceVisit.partyCardIds,
          {
            sourceTableIds: sourceVisit.tableIds,
            sourceTableLabel: getTableLabel(table, tables),
            sourcePreJoinOrderIds: orders
              .filter((order) => order.visitId === sourceVisit.id)
              .map((order) => order.id),
            targetTableIds: primaryVisit.tableIds,
            targetTableLabel: getTableLabel(occupiedTables[0], tables),
            targetPreJoinOrderIds: orders
              .filter((order) => order.visitId === primaryVisit.id)
              .map((order) => order.id),
          },
        );
      });
      updateVisitTableIds(sessionId, primaryVisit.id, group.tableIds);
      group.tableIds.forEach((tableId) => updateTable(tableId, { status: "occupied" }));
    }
    closeModal();
    setTableMergeMode(false);
  }

  function confirmSplit() {
    if (modal.type !== "splitConfirm") return;
    const groupTables = tables.filter((table) => table.mergedGroupId === modal.groupId);
    const occupiedTables = groupTables.filter((table) => table.status === "occupied");
    const activeVisits = getActiveVisitsForTables(occupiedTables, (tableId) =>
      getActiveVisitForTable(sessionId, tableId),
    );
    if (occupiedTables.length > 0 && activeVisits.length > 0) {
      const primaryTable = [...occupiedTables].sort((a, b) => Number(a.number) - Number(b.number))[0];
      const primaryVisit = activeVisits[0];
      updateVisitTableIds(sessionId, primaryVisit.id, [primaryTable.id]);
      occupiedTables.forEach((table) =>
        updateTable(table.id, { status: table.id === primaryTable.id ? "occupied" : "empty" }),
      );
    }
    splitMergeGroup(sessionId, modal.groupId);
    closeModal();
    setTableMergeMode(false);
  }

  function confirmDelete() {
    if (modal.type !== "deleteConfirm") return;
    deleteTables(modal.tables.map((table) => table.id));
    clearSelection();
    closeModal();
    setTableEditMode("idle");
  }

  function confirmWalkIn(table: Table, guestCount: number) {
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      setModal({ type: "walkInConfirm", table, error: t.guestCountRequired });
      return;
    }
    const group = table.mergedGroupId ? getMergeGroupByTableId(sessionId, table.id) : null;
    const targetCapacity = group
      ? getMergedGroupCapacity(sessionId, group.id).maxCapacity
      : table.maxCapacity;
    if (guestCount > targetCapacity) {
      setModal({ type: "walkInConfirm", table, error: t.partyExceedsTableCapacity });
      return;
    }
    const tableIds = group?.tableIds ?? [table.id];
    createWalkInVisit(sessionId, tableIds, guestCount);
    tableIds.forEach((tableId) => updateTable(tableId, { status: "occupied" }));
    setModal({ type: "order", table: { ...table, status: "occupied" } });
  }

  function confirmCleaned(table: Table) {
    const group = table.mergedGroupId ? getMergeGroupByTableId(sessionId, table.id) : null;
    const tableIds = group?.tableIds ?? [table.id];
    tableIds.forEach((tableId) => completeVisitsForTable(sessionId, tableId));
    tableIds.forEach((tableId) => updateTable(tableId, { status: "empty" }));
    closeModal();
  }

  function assignSelectedPartyCard(table: Table) {
    if (!selectedPartyCardId) return false;
    const partyCard = getPartyCard(sessionId, selectedPartyCardId);
    if (!partyCard) return false;
    const group = table.mergedGroupId ? getMergeGroupByTableId(sessionId, table.id) : null;
    const tableIds = group?.tableIds ?? [table.id];
    const targetCapacity = group
      ? getMergedGroupCapacity(sessionId, group.id).maxCapacity
      : table.maxCapacity;

    if (table.status === "cleaning") return false;

    if (table.status === "occupied") {
      const visit = getActiveVisitForTable(sessionId, table.id);
      if (!visit || visit.status !== "active") return false;
      const existingGuests = visit.partyCardIds.reduce((sum, partyCardId) => {
        const mappedCard = getPartyCard(sessionId, partyCardId);
        return sum + getPartyCardGuestCount(mappedCard);
      }, 0);
      const incomingGuests = getPartyCardGuestCount(partyCard);
      const totalGuests = existingGuests + incomingGuests;
      if (totalGuests > targetCapacity) {
        setModal({
          type: "message",
          title: t.confirmJoinTitle,
          body: t.joinExceedsTableCapacity,
        });
        return true;
      }
      setModal({
        type: "joinConfirm",
        table,
        partyCard,
        visit,
        tableLabel: getTableLabel(table, tables),
        existingGuests,
        incomingGuests,
        totalGuests,
        capacity: targetCapacity,
      });
      return true;
    }

    if (getPartyCardGuestCount(partyCard) > targetCapacity) {
      setModal({
        type: "message",
        title: t.assignToTable,
        body: t.partyExceedsTableCapacity,
      });
      return true;
    }
    const visit = assignPartyCardToTable(sessionId, selectedPartyCardId, tableIds);
    if (!visit) return false;
    const occupiedTable = { ...table, status: "occupied" as const };
    tableIds.forEach((tableId) => updateTable(tableId, { status: "occupied" }));
    selectPartyCardForAssignment(sessionId, null);
    setModal({ type: "order", table: occupiedTable });
    return true;
  }

  function confirmJoin() {
    if (modal.type !== "joinConfirm") return;
    const visit = joinPartyCardToVisit(sessionId, modal.visit.id, modal.partyCard.id, {
      targetTableIds: modal.visit.tableIds,
      targetTableLabel: modal.tableLabel,
      targetPreJoinOrderIds: orders
        .filter((order) => order.visitId === modal.visit.id)
        .map((order) => order.id),
    });
    if (!visit) return;
    selectPartyCardForAssignment(sessionId, null);
    setModal({ type: "order", table: modal.table });
  }

  function startPartyCardMove(request: PartyCardMoveState) {
    if (getPayableAmountForVisit(orders, request.sourceVisit.id) > 0) {
      setModal({
        type: "message",
        title: t.moveJoin,
        body: t.prepayBeforeMove,
      });
      return;
    }
    if (
      request.sourceVisit.partyCardIds.length > 1 &&
      request.partyCards.length !== request.sourceVisit.partyCardIds.length
    ) {
      setModal({
        type: "message",
        title: t.moveJoin,
        body: t.movingFromJoinedNotSupported,
      });
      return;
    }
    selectPartyCardForAssignment(sessionId, null);
    setPartyCardMove(request);
  }

  function selectPartyCardMoveTarget(table: Table) {
    if (!partyCardMove) return false;

    const group = table.mergedGroupId ? getMergeGroupByTableId(sessionId, table.id) : null;
    const targetTableIds = group?.tableIds ?? [table.id];
    const targetLabel = getTableLabel(table, tables);
    const sameSource = partyCardMove.sourceVisit.tableIds.some((tableId) =>
      targetTableIds.includes(tableId),
    );

    if ((table.status !== "occupied" && table.status !== "empty") || sameSource) {
      setModal({
        type: "message",
        title: t.moveJoin,
        body: t.selectAnotherOccupiedTable,
      });
      return true;
    }

    const targetVisit = getActiveVisitForTable(sessionId, table.id);
    if (table.status === "occupied" && (!targetVisit || targetVisit.status !== "active")) {
      setModal({
        type: "message",
        title: t.moveJoin,
        body: t.selectAnotherOccupiedTable,
      });
      return true;
    }

    const capacity = group
      ? getMergedGroupCapacity(sessionId, group.id).maxCapacity
      : table.maxCapacity;
    const existingGuests = targetVisit?.partyCardIds.reduce((sum, partyCardId) => {
      const mappedCard = getPartyCard(sessionId, partyCardId);
      return sum + getPartyCardGuestCount(mappedCard);
    }, 0) ?? 0;
    const incomingGuests = partyCardMove.partyCards.reduce(
      (sum, partyCard) => sum + getPartyCardGuestCount(partyCard),
      0,
    );
    const totalGuests = existingGuests + incomingGuests;

    if (totalGuests > capacity) {
      setModal({
        type: "message",
        title: t.moveJoin,
        body: t.moveExceedsTableCapacity,
      });
      return true;
    }

    setModal({
      type: "moveJoinConfirm",
      table,
      partyCards: partyCardMove.partyCards,
      sourceVisit: partyCardMove.sourceVisit,
      targetVisit: targetVisit ?? emptyMoveTargetVisit(sessionId, targetTableIds),
      sourceLabel: partyCardMove.sourceLabel,
      targetLabel,
      sourceTableIds: partyCardMove.sourceVisit.tableIds,
      targetTableIds,
      existingGuests,
      incomingGuests,
      totalGuests,
      capacity,
    });
    return true;
  }

  function confirmMoveJoin() {
    if (modal.type !== "moveJoinConfirm") return;
    if (modal.table.status === "empty") {
      modal.sourceTableIds.forEach((tableId) => updateTable(tableId, { status: "cleaning" }));
      modal.targetTableIds.forEach((tableId) => updateTable(tableId, { status: "occupied" }));
      updateVisitTableIds(sessionId, modal.sourceVisit.id, modal.targetTableIds);
      setPartyCardMove(null);
      closeModal();
      return;
    }
    const result = movePartyCardToVisit(
      sessionId,
      modal.sourceVisit.id,
      modal.targetVisit.id,
      modal.partyCards.map((partyCard) => partyCard.id),
      {
        sourceTableIds: modal.sourceTableIds,
        sourceTableLabel: modal.sourceLabel,
        sourcePreJoinOrderIds: orders
          .filter((order) => order.visitId === modal.sourceVisit.id)
          .map((order) => order.id),
        targetTableIds: modal.targetTableIds,
        targetTableLabel: modal.targetLabel,
        targetPreJoinOrderIds: orders
          .filter((order) => order.visitId === modal.targetVisit.id)
          .map((order) => order.id),
      },
    );
    if (!result) return;
    modal.sourceTableIds.forEach((tableId) => updateTable(tableId, { status: "cleaning" }));
    modal.targetTableIds.forEach((tableId) => updateTable(tableId, { status: "occupied" }));
    setPartyCardMove(null);
    closeModal();
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
        <SafeSection label="POS Toolbar">
          <PosToolbar
            onOpenMenuSettings={() => setMenuSettingsOpen(true)}
            onOpenSalesReport={() => setSalesReportOpen(true)}
            onResetLocalData={() => setModal({ type: "resetLocalDataConfirm" })}
            sessionId={sessionId}
          />
        </SafeSection>
        <SafeSection label="Table Canvas">
          <TableCanvas
            hasDuplicateNumbers={hasDuplicateNumbers}
            onAssignSelectedPartyCard={assignSelectedPartyCard}
            onOpenModal={setModal}
            onPartyCardMoveTarget={selectPartyCardMoveTarget}
            sessionId={sessionId}
          />
        </SafeSection>
      </section>
      <SafeSection label="Right Sidebar">
        <RightSidebar sessionId={sessionId} />
      </SafeSection>

      <TableEditActionBar
        disabled={tableEditMode === "number" && hasDuplicateNumbers}
        hasDuplicateNumbers={hasDuplicateNumbers}
        onCancel={cancelMode}
        onDone={finishMode}
        selectedCount={selectedTables.length}
      />
      <TableMergeActionBar
        onCancel={cancelMergeMode}
        onMerge={requestMerge}
        onSplit={requestSplit}
        sessionId={sessionId}
      />

      {partyCardMove ? (
        <div className="fixed bottom-6 left-1/2 z-40 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-3xl border border-slate-200 bg-club-black p-4 text-white shadow-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">{t.selectOccupiedTableToJoin}</p>
              <p className="mt-1 text-xs font-bold text-white/70">
                {partyCardMove.partyCards.map((partyCard) => partyCard.code).join(", ")} · {t.table} {partyCardMove.sourceLabel}
              </p>
            </div>
            <Button onClick={cancelPartyCardMove} variant="secondary">
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      <CapacityModal modal={modal} onClose={closeModal} sessionId={sessionId} />
      <SafeSection label="Menu Settings">
        <MenuSettingsModal
          onClose={() => setMenuSettingsOpen(false)}
          open={menuSettingsOpen}
          sessionId={sessionId}
        />
      </SafeSection>
      <SafeSection label="Sales Report">
        <SalesReportModal
          onClose={() => setSalesReportOpen(false)}
          open={salesReportOpen}
          sessionId={sessionId}
        />
      </SafeSection>

      <Modal onClose={closeModal} open={modal.type === "message"} title={modal.type === "message" ? modal.title : ""}>
        {modal.type === "message" ? (
          <p className="text-sm font-semibold text-slate-600">{modal.body}</p>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "resetLocalDataConfirm"}
        title={t.resetLocalDataTitle}
      >
        <div className="grid gap-5">
          <p className="text-sm font-semibold text-slate-600">{t.resetLocalDataPrompt}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={closeModal} variant="secondary">
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                resetClubxLocalData();
                window.location.href = "/login";
              }}
              variant="danger"
            >
              {t.resetLocalData}
            </Button>
          </div>
        </div>
      </Modal>

      <SafeSection label="Order Panel">
        <OrderPanel
          onClose={closeModal}
          onStartPartyCardMove={startPartyCardMove}
          open={modal.type === "order"}
          partyCard={activePartyCard}
          table={orderTable}
          visit={activeVisit}
        />
      </SafeSection>

      <Modal
        onClose={closeModal}
        open={modal.type === "walkInConfirm"}
        title={t.createWalkInTitle}
      >
        {modal.type === "walkInConfirm" ? (
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              confirmWalkIn(modal.table, Number(form.get("guestCount")));
            }}
          >
            <p className="text-sm font-semibold text-slate-600">
              {t.createWalkInPrompt}
            </p>
            <label className="grid gap-2 text-sm font-bold text-slate-600">
              {t.guestCount}
              <input
                className="touch-target rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-club-green"
                min={1}
                name="guestCount"
                required
                step={1}
                type="number"
              />
            </label>
            {modal.error ? (
              <p className="rounded-2xl bg-club-red/10 p-3 text-sm font-bold text-club-red">
                {modal.error}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button type="submit">
                {t.createWalkIn}
              </Button>
            </div>
          </form>
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

      <Modal
        onClose={closeModal}
        open={modal.type === "joinConfirm"}
        title={t.confirmJoinTitle}
      >
        {modal.type === "joinConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">{t.confirmJoinPrompt}</p>
            <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <p>{modal.partyCard.code}</p>
              <p>
                {t.table}: {modal.tableLabel}
              </p>
              <p>
                {t.existingGuestCount}: {modal.existingGuests}
              </p>
              <p>
                {t.incomingGuestCount}: {modal.incomingGuests}
              </p>
              <p>
                {t.totalAfterJoin}: {modal.totalGuests}
              </p>
              <p>
                {t.maxCapacity}: {modal.capacity}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={confirmJoin}>{t.confirmJoin}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "moveJoinConfirm"}
        title={t.moveJoinTitle}
      >
        {modal.type === "moveJoinConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {language === "ko"
                ? `이 Party Card를 이동해서 ${modal.targetLabel} 테이블에 합석하시겠습니까?`
                : `Move this party and join Table ${modal.targetLabel}?`}
            </p>
            <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <p>{modal.partyCards.map((partyCard) => partyCard.code).join(", ")}</p>
              <p>
                {t.sourceTable}: {modal.sourceLabel}
              </p>
              <p>
                {t.targetTable}: {modal.targetLabel}
              </p>
              <p>
                {t.existingGuestCount}: {modal.existingGuests}
              </p>
              <p>
                {t.incomingGuestCount}: {modal.incomingGuests}
              </p>
              <p>
                {t.totalAfterJoin}: {modal.totalGuests}
              </p>
              <p>
                {t.maxCapacity}: {modal.capacity}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={confirmMoveJoin}>{t.confirmJoin}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "mergeConfirm"}
        title={t.mergeSelectedTablesTitle}
      >
        {modal.type === "mergeConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {t.mergeSelectedTablesPrompt}
            </p>
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-black">
              {modal.tables.map((table) => `${t.table} ${table.number}`).join(", ")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={confirmMerge}>{t.merge}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={closeModal}
        open={modal.type === "splitConfirm"}
        title={t.splitMergedTableTitle}
      >
        {modal.type === "splitConfirm" ? (
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-slate-600">
              {t.splitMergedTablePrompt}
            </p>
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-black">{modal.label}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={closeModal} variant="secondary">
                {t.cancel}
              </Button>
              <Button onClick={confirmSplit}>{t.split}</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

function getTableLabel(table: Table, tables: Table[]) {
  if (!table.mergedGroupId) return table.number;
  const labels = tables
    .filter((item) => item.mergedGroupId === table.mergedGroupId)
    .map((item) => item.number);
  return labels.length > 0 ? labels.join("+") : table.number;
}

function getPayableAmountForVisit(orders: Order[], visitId: string) {
  return orders
    .filter((order) => order.visitId === visitId)
    .flatMap((order) => order.items)
    .reduce((sum, item) => {
      const activeQuantity = Math.max(
        0,
        item.quantity - item.cancelledQuantity - (item.paidQuantity ?? 0),
      );
      const serviceQuantity = Math.min(item.serviceQuantity, activeQuantity);
      return sum + (activeQuantity - serviceQuantity) * item.unitPrice;
    }, 0);
}

function getActiveVisitsForTables(tables: Table[], getActiveVisit: (tableId: string) => Visit | undefined) {
  const visits = tables
    .map((table) => getActiveVisit(table.id))
    .filter((visit): visit is Visit => Boolean(visit));
  const seen = new Set<string>();
  return visits.filter((visit) => {
    if (seen.has(visit.id)) return false;
    seen.add(visit.id);
    return true;
  });
}

function getPartyCardGuestCount(partyCard?: PartyCard) {
  if (!partyCard) return 0;
  return partyCard.guests.length > 0 ? partyCard.guests.length : partyCard.guestCount ?? 1;
}

function emptyMoveTargetVisit(sessionId: string, tableIds: string[]): Visit {
  const now = new Date().toISOString();
  return {
    id: `empty-target-${tableIds.join("-")}`,
    sessionId,
    tableIds,
    partyCardIds: [],
    sourceType: "walkIn",
    visitCode: "",
    startedAt: now,
    expectedEndAt: now,
    status: "active",
  };
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
  const tables = useTableStore((state) => state.tablesBySession[sessionId] ?? EMPTY_TABLES);
  const canPlaceTable = useTableStore((state) => state.canPlaceTable);
  const lastTableCapacityPreset = useWorkspaceStore(
    (state) => state.lastTableCapacityPreset,
  );
  const setLastTableCapacityPreset = useWorkspaceStore(
    (state) => state.setLastTableCapacityPreset,
  );
  const [error, setError] = useState("");

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
          const visualSize = normalizedMax <= 2 ? 1 : 2;
          const tempTable: Table = {
            id: "new-table-preview",
            sessionId,
            number: String(tables.length + 1),
            status: "empty",
            size: visualSize,
            minCapacity: normalizedMin,
            maxCapacity: normalizedMax,
            x: modal.x,
            y: modal.y,
          };

          if (!canPlaceTable(sessionId, tempTable)) {
            setError(t.tablesCannotOverlap);
            return;
          }

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
          setError("");
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
          {language === "ko"
            ? "Size 1: 최대 2명 · Size 2: 최대 5명 이상은 같은 큰 정사각형으로 표시됩니다. 대인원은 병합 테이블을 사용해 주세요."
            : "Size 1: max 2 people · Size 2: max 5+ renders as the same large square. Large parties should use merged tables."}
        </div>
        {error ? (
          <p className="rounded-2xl bg-club-red/10 p-3 text-sm font-bold text-club-red">
            {error}
          </p>
        ) : null}
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
