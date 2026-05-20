import { mockBusinessSessions } from "@/lib/mock/sessions";
import type {
  BusinessSession,
  MenuCategory,
  MenuItem,
  Order,
  PartyCard,
  Payment,
  StaffDevice,
  Table,
  TableMergeGroup,
  TimeAdjustmentLog,
  Visit,
} from "@/types";
import type {
  PosBusinessSessionCreateDto,
  PosBusinessSessionUpdateDto,
  PosLocalMenuSnapshot,
  PosOrderCreateDto,
  PosOrderUpdateDto,
  PosPartyCardCreateDto,
  PosPartyCardUpdateDto,
  PosPaymentCreateDto,
  PosQrOrderRegistrationCreateDto,
  PosQrOrderRegistrationDto,
  PosStaffDeviceCreateDto,
  PosTableCreateDto,
  PosTableMergeGroupCreateDto,
  PosTableUpdateDto,
  PosVisitCreateDto,
  PosVisitUpdateDto,
} from "@/types/posApi";
import type { PosRepositories } from "@/lib/pos/repositories/types";
import { mapPaymentToPosPaymentCreateDto } from "@/lib/pos/mappers";
import {
  broadcastLocalRepositorySync,
  localKeys,
  readLocalJson,
  writeLocalJson,
} from "./storage";

function nowIso() {
  return new Date().toISOString();
}

function readSessions() {
  return readLocalJson<BusinessSession[]>(localKeys.sessions, mockBusinessSessions);
}

function writeSessions(sessions: BusinessSession[]) {
  writeLocalJson(localKeys.sessions, sessions);
}

function findSessionIdByRecord<T extends { sessionId: string; id: string }>(
  keyFactory: (sessionId: string) => string,
  id: string,
  sessionIds = readSessions().map((session) => session.id),
) {
  return sessionIds.find((sessionId) =>
    readLocalJson<T[]>(keyFactory(sessionId), []).some((item) => item.id === id),
  );
}

function getTableSize(minCapacity: number, maxCapacity: number): Table["size"] {
  return Math.max(minCapacity, maxCapacity) <= 2 ? 1 : 2;
}

export const localPosRepositories: PosRepositories = {
  sessions: {
    async list() {
      return readSessions();
    },
    async create(payload: PosBusinessSessionCreateDto) {
      const session: BusinessSession = {
        id: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`,
        name: payload.name,
        createdAt: nowIso(),
        lastAccessedAt: null,
      };
      writeSessions([session, ...readSessions()]);
      return session;
    },
    async get(sessionId: string) {
      return readSessions().find((session) => session.id === sessionId) ?? null;
    },
    async update(sessionId: string, payload: PosBusinessSessionUpdateDto) {
      let nextSession = readSessions().find((session) => session.id === sessionId);
      if (!nextSession) {
        nextSession = {
          id: sessionId,
          name: payload.name ?? sessionId,
          createdAt: nowIso(),
          lastAccessedAt: null,
        };
      } else {
        nextSession = {
          ...nextSession,
          name: payload.name ?? nextSession.name,
          lastAccessedAt: nextSession.lastAccessedAt,
        };
      }
      writeSessions([nextSession, ...readSessions().filter((session) => session.id !== sessionId)]);
      return nextSession;
    },
    async close(sessionId: string) {
      const session =
        readSessions().find((item) => item.id === sessionId) ??
        ({ id: sessionId, name: sessionId, createdAt: nowIso(), lastAccessedAt: nowIso() } satisfies BusinessSession);
      return session;
    },
  },
  tables: {
    async list(sessionId: string) {
      return readLocalJson<Table[]>(localKeys.tables(sessionId), []);
    },
    async create(sessionId: string, payload: PosTableCreateDto) {
      const current = readLocalJson<Table[]>(localKeys.tables(sessionId), []);
      const table: Table = {
        id: `table-${sessionId}-${Date.now()}`,
        sessionId,
        number: payload.number ?? String(current.length + 1),
        status: "empty",
        size: getTableSize(payload.min_capacity, payload.max_capacity),
        minCapacity: payload.min_capacity,
        maxCapacity: payload.max_capacity,
        x: payload.x,
        y: payload.y,
      };
      writeLocalJson(localKeys.tables(sessionId), [...current, table]);
      broadcastLocalRepositorySync("tables", sessionId);
      return table;
    },
    async update(tableId: string, payload: PosTableUpdateDto) {
      const sessionId = findSessionIdByRecord<Table>(localKeys.tables, tableId);
      if (!sessionId) throw new Error("Table not found.");
      let updated: Table | undefined;
      const next = readLocalJson<Table[]>(localKeys.tables(sessionId), []).map((table) => {
        if (table.id !== tableId) return table;
        updated = {
          ...table,
          number: payload.number ?? table.number,
          status: payload.status === "occupied" || payload.status === "cleaning" ? payload.status : table.status,
          size:
            payload.visual_size === 1 || payload.visual_size === 2 || payload.visual_size === 3
              ? payload.visual_size
              : table.size,
          minCapacity: payload.min_capacity ?? table.minCapacity,
          maxCapacity: payload.max_capacity ?? table.maxCapacity,
          x: payload.x ?? table.x,
          y: payload.y ?? table.y,
          mergedGroupId: payload.merged_group_id ?? table.mergedGroupId,
          originalPosition:
            payload.original_x !== undefined && payload.original_y !== undefined
              ? payload.original_x === null || payload.original_y === null
                ? undefined
                : { x: payload.original_x, y: payload.original_y }
              : table.originalPosition,
        };
        return updated;
      });
      writeLocalJson(localKeys.tables(sessionId), next);
      broadcastLocalRepositorySync("tables", sessionId);
      if (!updated) throw new Error("Table not found.");
      return updated;
    },
    async delete(tableId: string) {
      const sessionId = findSessionIdByRecord<Table>(localKeys.tables, tableId);
      if (!sessionId) return;
      writeLocalJson(
        localKeys.tables(sessionId),
        readLocalJson<Table[]>(localKeys.tables(sessionId), []).filter((table) => table.id !== tableId),
      );
      broadcastLocalRepositorySync("tables", sessionId);
    },
  },
  mergeGroups: {
    async list(sessionId: string) {
      return readLocalJson<TableMergeGroup[]>(localKeys.mergeGroups(sessionId), []);
    },
    async create(sessionId: string, payload: PosTableMergeGroupCreateDto) {
      const group: TableMergeGroup = {
        id: `merge-${sessionId}-${Date.now()}`,
        sessionId,
        tableIds: payload.table_ids,
        label: payload.label,
        originalPositions: {},
        createdAt: nowIso(),
      };
      const groups = readLocalJson<TableMergeGroup[]>(localKeys.mergeGroups(sessionId), []);
      writeLocalJson(localKeys.mergeGroups(sessionId), [...groups, group]);
      broadcastLocalRepositorySync("tables", sessionId);
      return group;
    },
    async split(groupId: string) {
      const sessionId = findSessionIdByRecord<TableMergeGroup>(localKeys.mergeGroups, groupId);
      if (!sessionId) return;
      writeLocalJson(
        localKeys.mergeGroups(sessionId),
        readLocalJson<TableMergeGroup[]>(localKeys.mergeGroups(sessionId), []).filter((group) => group.id !== groupId),
      );
      broadcastLocalRepositorySync("tables", sessionId);
    },
  },
  menu: {
    async getSnapshot(sessionId: string): Promise<PosLocalMenuSnapshot> {
      return {
        categories: readLocalJson<MenuCategory[]>(localKeys.menuCategories(sessionId), []),
        items: readLocalJson<MenuItem[]>(localKeys.menuItems(sessionId), []),
        locked: readLocalJson<boolean>(localKeys.menuLocked(sessionId), true),
      };
    },
    async saveSnapshot(sessionId: string, snapshot: PosLocalMenuSnapshot) {
      writeLocalJson(localKeys.menuCategories(sessionId), snapshot.categories);
      writeLocalJson(localKeys.menuItems(sessionId), snapshot.items);
      writeLocalJson(localKeys.menuLocked(sessionId), snapshot.locked);
      broadcastLocalRepositorySync("menu", sessionId);
      return snapshot;
    },
    async listCategories(sessionId: string) {
      return readLocalJson<MenuCategory[]>(localKeys.menuCategories(sessionId), []);
    },
    async listItems(sessionId: string) {
      return readLocalJson<MenuItem[]>(localKeys.menuItems(sessionId), []);
    },
  },
  partyCards: {
    async list(sessionId: string) {
      return readLocalJson<PartyCard[]>(localKeys.partyCards(sessionId), []);
    },
    async create(sessionId: string, payload: PosPartyCardCreateDto) {
      const card: PartyCard = {
        id: `party-${sessionId}-${Date.now()}`,
        sessionId,
        type: payload.type === "waiting" || payload.type === "walkIn" ? payload.type : "reservation",
        code: payload.code,
        reservationTime: payload.reservation_time ?? undefined,
        waitingOrder: payload.waiting_order ?? undefined,
        guests: (payload.guests ?? []).map((guest, index) => ({
          id: guest.id ?? `guest-${Date.now()}-${index}`,
          name: guest.name,
          phone: guest.phone ?? undefined,
          username: guest.username ?? undefined,
          checkedIn: guest.checked_in,
        })),
        guestCount: payload.guest_count ?? undefined,
        tableCount: payload.table_count ?? 1,
        status:
          payload.status === "seated" || payload.status === "completed" || payload.status === "overdue"
            ? payload.status
            : "waiting",
        sourceId: payload.source_id ?? undefined,
        mappedTableIds: [],
        upstreamStatus: payload.upstream_status ?? undefined,
      };
      writeLocalJson(localKeys.partyCards(sessionId), [...readLocalJson<PartyCard[]>(localKeys.partyCards(sessionId), []), card]);
      broadcastLocalRepositorySync("visits", sessionId);
      return card;
    },
    async update(partyCardId: string, payload: PosPartyCardUpdateDto) {
      const sessionId = findSessionIdByRecord<PartyCard>(localKeys.partyCards, partyCardId);
      if (!sessionId) throw new Error("Party card not found.");
      let updated: PartyCard | undefined;
      const next = readLocalJson<PartyCard[]>(localKeys.partyCards(sessionId), []).map((card) => {
        if (card.id !== partyCardId) return card;
        updated = {
          ...card,
          code: payload.code ?? card.code,
          tableCount: payload.table_count ?? card.tableCount,
          upstreamStatus: payload.upstream_status ?? card.upstreamStatus,
        };
        return updated;
      });
      writeLocalJson(localKeys.partyCards(sessionId), next);
      broadcastLocalRepositorySync("visits", sessionId);
      if (!updated) throw new Error("Party card not found.");
      return updated;
    },
  },
  visits: {
    async list(sessionId: string) {
      return readLocalJson<Visit[]>(localKeys.visits(sessionId), []);
    },
    async create(sessionId: string, payload: PosVisitCreateDto) {
      const visit: Visit = {
        id: `visit-${sessionId}-${Date.now()}`,
        sessionId,
        tableIds: payload.table_ids,
        partyCardIds: payload.party_card_ids,
        sourceType:
          payload.source_type === "waiting" || payload.source_type === "walkIn" || payload.source_type === "joined"
            ? payload.source_type
            : "reservation",
        sourceId: undefined,
        visitCode: payload.visit_code,
        startedAt: payload.started_at ?? nowIso(),
        expectedEndAt: payload.expected_end_at ?? nowIso(),
        status: payload.status === "paid" || payload.status === "cleaning" || payload.status === "completed" ? payload.status : "active",
        isJoined: payload.is_joined,
        joinedAt: payload.joined_at ?? undefined,
      };
      writeLocalJson(localKeys.visits(sessionId), [...readLocalJson<Visit[]>(localKeys.visits(sessionId), []), visit]);
      broadcastLocalRepositorySync("visits", sessionId);
      return visit;
    },
    async update(visitId: string, payload: PosVisitUpdateDto) {
      const sessionId = findSessionIdByRecord<Visit>(localKeys.visits, visitId);
      if (!sessionId) throw new Error("Visit not found.");
      let updated: Visit | undefined;
      const next = readLocalJson<Visit[]>(localKeys.visits(sessionId), []).map((visit) => {
        if (visit.id !== visitId) return visit;
        updated = {
          ...visit,
          expectedEndAt: payload.expected_end_at ?? visit.expectedEndAt,
          status: payload.status === "paid" || payload.status === "cleaning" || payload.status === "completed" ? payload.status : visit.status,
        };
        return updated;
      });
      writeLocalJson(localKeys.visits(sessionId), next);
      broadcastLocalRepositorySync("visits", sessionId);
      if (!updated) throw new Error("Visit not found.");
      return updated;
    },
  },
  orders: {
    async list(sessionId: string) {
      return readLocalJson<Order[]>(localKeys.orders(sessionId), []);
    },
    async create(sessionId: string, payload: PosOrderCreateDto) {
      const current = readLocalJson<Order[]>(localKeys.orders(sessionId), []);
      const order: Order = {
        id: `order-${sessionId}-${Date.now()}`,
        sessionId,
        visitId: payload.visit_id,
        segmentId: undefined,
        orderNumber: current.length + 1,
        orderedBy: {
          type: payload.ordered_by_type === "handy" ? "handy" : "counter",
          name: payload.ordered_by_name ?? "Counter",
        },
        orderType: payload.order_type === "additional" || payload.order_type === "modified" ? payload.order_type : "initial",
        items: payload.items.map((item, index) => ({
          id: item.id ?? `order-item-${Date.now()}-${index}`,
          menuItemId: item.menu_item_id,
          menuName: item.menu_name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          serviceQuantity: item.service_quantity,
          cancelledQuantity: item.cancelled_quantity,
          paidQuantity: item.paid_quantity,
        })),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      writeLocalJson(localKeys.orders(sessionId), [...current, order]);
      broadcastLocalRepositorySync("orders", sessionId);
      return order;
    },
    async update(orderId: string, payload: PosOrderUpdateDto) {
      const sessionId = findSessionIdByRecord<Order>(localKeys.orders, orderId);
      if (!sessionId) throw new Error("Order not found.");
      let updated: Order | undefined;
      const next = readLocalJson<Order[]>(localKeys.orders(sessionId), []).map((order) => {
        if (order.id !== orderId) return order;
        updated = { ...order, updatedAt: nowIso() };
        return updated;
      });
      writeLocalJson(localKeys.orders(sessionId), next);
      broadcastLocalRepositorySync("orders", sessionId);
      if (!updated) throw new Error("Order not found.");
      return updated;
    },
  },
  payments: {
    async list(sessionId: string) {
      return readLocalJson<Payment[]>(localKeys.payments(sessionId), []);
    },
    async create(sessionId: string, payload: PosPaymentCreateDto) {
      const payment: Payment = {
        id: `payment-${sessionId}-${Date.now()}`,
        sessionId,
        visitId: payload.visit_id,
        tableLabel: payload.table_label,
        segmentId: undefined,
        paidAt: nowIso(),
        items: payload.items.map((item) => ({
          menuItemId: item.menu_item_id ?? undefined,
          menuName: item.menu_name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          amount: item.amount,
          discountAmount: item.discount_amount,
        })),
        totalAmount: payload.total_amount,
        discountAmount: payload.discount_amount,
        status: "paid",
        isPrepaid: payload.is_prepaid,
      };
      void mapPaymentToPosPaymentCreateDto(payment);
      writeLocalJson(localKeys.payments(sessionId), [...readLocalJson<Payment[]>(localKeys.payments(sessionId), []), payment]);
      broadcastLocalRepositorySync("payments", sessionId);
      return payment;
    },
    async cancel(paymentId: string) {
      return updatePaymentStatus(paymentId, "cancelled");
    },
    async restore(paymentId: string) {
      return updatePaymentStatus(paymentId, "paid");
    },
  },
  devices: {
    async list(sessionId: string) {
      return readLocalJson<Record<string, StaffDevice[]>>(localKeys.devices, {})[sessionId] ?? [];
    },
    async create(sessionId: string, payload: PosStaffDeviceCreateDto) {
      const device: StaffDevice = {
        id: `device-${Date.now()}`,
        sessionId,
        activationCode: payload.activation_code ?? "",
        staffName: payload.staff_name,
        deviceName: payload.device_name ?? undefined,
        connectedAt: nowIso(),
        status: "active",
      };
      const devices = readLocalJson<Record<string, StaffDevice[]>>(localKeys.devices, {});
      writeLocalJson(localKeys.devices, { ...devices, [sessionId]: [...(devices[sessionId] ?? []), device] });
      broadcastLocalRepositorySync("handy", sessionId);
      return device;
    },
    async delete(deviceId: string) {
      const devices = readLocalJson<Record<string, StaffDevice[]>>(localKeys.devices, {});
      const next = Object.fromEntries(
        Object.entries(devices).map(([sessionId, list]) => [
          sessionId,
          list.map((device) => device.id === deviceId ? { ...device, status: "kicked" as const } : device),
        ]),
      );
      writeLocalJson(localKeys.devices, next);
      broadcastLocalRepositorySync("handy");
    },
  },
  qrFallback: {
    async createRegistration(sessionId: string, payload: PosQrOrderRegistrationCreateDto) {
      const keys = readLocalJson<string[]>(localKeys.qrOrders(sessionId), []);
      if (!keys.includes(payload.idempotency_key)) {
        writeLocalJson(localKeys.qrOrders(sessionId), [...keys, payload.idempotency_key]);
      }
      const registration: PosQrOrderRegistrationDto = {
        id: `qr-${sessionId}-${Date.now()}`,
        session_id: sessionId,
        visit_id: payload.visit_id,
        order_id: payload.order_id,
        idempotency_key: payload.idempotency_key,
        payload_json: payload.payload_json,
        registered_at: nowIso(),
      };
      broadcastLocalRepositorySync("orders", sessionId);
      return registration;
    },
    async listRegisteredKeys(sessionId: string) {
      return readLocalJson<string[]>(localKeys.qrOrders(sessionId), []);
    },
  },
  timeLogs: {
    async listByVisit(visitId: string) {
      const all = readAllTimeLogs();
      return all[visitId] ?? [];
    },
    async listBySession(sessionId: string) {
      return readLocalJson<Record<string, TimeAdjustmentLog[]>>(localKeys.timeLogsByVisit(sessionId), {});
    },
  },
};

function readAllTimeLogs() {
  const sessions = readSessions();
  return sessions.reduce<Record<string, TimeAdjustmentLog[]>>((logs, session) => {
    return { ...logs, ...readLocalJson<Record<string, TimeAdjustmentLog[]>>(localKeys.timeLogsByVisit(session.id), {}) };
  }, {});
}

function updatePaymentStatus(paymentId: string, status: Payment["status"]) {
  const sessionId = findSessionIdByRecord<Payment>(localKeys.payments, paymentId);
  if (!sessionId) throw new Error("Payment not found.");
  let updated: Payment | undefined;
  const next = readLocalJson<Payment[]>(localKeys.payments(sessionId), []).map((payment) => {
    if (payment.id !== paymentId) return payment;
    updated = { ...payment, status };
    return updated;
  });
  writeLocalJson(localKeys.payments(sessionId), next);
  broadcastLocalRepositorySync("payments", sessionId);
  if (!updated) throw new Error("Payment not found.");
  return updated;
}
