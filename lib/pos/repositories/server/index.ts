import { posClient } from "@/lib/api/posClient";
import {
  mapOrderToPosOrderCreateDto,
  mapPartyCardToPosPartyCardCreateDto,
  mapPaymentToPosPaymentCreateDto,
  mapPosOrderDtoToOrder,
  mapPosPartyCardDtoToPartyCard,
  mapPosPaymentDtoToPayment,
  mapPosSessionDtoToBusinessSession,
  mapPosStaffDeviceDtoToStaffDevice,
  mapPosTableDtoToTable,
  mapPosVisitDtoToVisit,
  mapTableToPosTableCreateDto,
  mapVisitToPosVisitCreateDto,
} from "@/lib/pos/mappers";
import type {
  MenuCategory,
  MenuItem,
  TableMergeGroup,
  TimeAdjustmentLog,
} from "@/types";
import type { PosRepositories } from "@/lib/pos/repositories/types";
import type {
  PosLocalMenuSnapshot,
  PosOrderCreateDto,
  PosPartyCardCreateDto,
  PosPaymentCreateDto,
  PosTableMergeGroupDto,
  PosVisitCreateDto,
} from "@/types/posApi";

function mapMergeGroupDto(dto: PosTableMergeGroupDto): TableMergeGroup {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    tableIds: dto.table_ids,
    label: dto.label,
    originalPositions: dto.original_positions,
    createdAt: dto.created_at,
  };
}

export const serverPosRepositories: PosRepositories = {
  sessions: {
    async list() {
      return (await posClient.listPosSessions()).map(mapPosSessionDtoToBusinessSession);
    },
    async create(payload) {
      return mapPosSessionDtoToBusinessSession(await posClient.createPosSession(payload));
    },
    async get(sessionId) {
      return mapPosSessionDtoToBusinessSession(await posClient.getPosSession(sessionId));
    },
    async update(sessionId, payload) {
      return mapPosSessionDtoToBusinessSession(await posClient.updatePosSession(sessionId, payload));
    },
    async close(sessionId) {
      return mapPosSessionDtoToBusinessSession(await posClient.closePosSession(sessionId));
    },
  },
  tables: {
    async list(sessionId) {
      return (await posClient.listPosTables(sessionId)).map(mapPosTableDtoToTable);
    },
    async create(sessionId, payload) {
      return mapPosTableDtoToTable(await posClient.createPosTable(sessionId, payload));
    },
    async update(tableId, payload) {
      return mapPosTableDtoToTable(await posClient.updatePosTable(tableId, payload));
    },
    async delete(tableId) {
      await posClient.deletePosTable(tableId);
    },
  },
  mergeGroups: {
    async list(sessionId) {
      return (await posClient.listPosMergeGroups(sessionId)).map(mapMergeGroupDto);
    },
    async create(sessionId, payload) {
      return mapMergeGroupDto(await posClient.createPosMergeGroup(sessionId, payload));
    },
    async split(groupId) {
      await posClient.splitPosMergeGroup(groupId);
    },
  },
  menu: {
    async getSnapshot(_sessionId): Promise<PosLocalMenuSnapshot> {
      // TODO Phase 13C/13C-3: replace with backend menu endpoints when they are wired.
      return { categories: [], items: [], locked: true };
    },
    async saveSnapshot(_sessionId, snapshot) {
      // TODO Phase 13C/13C-3: persist categories, items, and lock state through backend menu endpoints.
      return snapshot;
    },
    async listCategories(_sessionId): Promise<MenuCategory[]> {
      // TODO Phase 13C/13C-3: call backend menu category endpoint.
      return [];
    },
    async listItems(_sessionId): Promise<MenuItem[]> {
      // TODO Phase 13C/13C-3: call backend menu item endpoint.
      return [];
    },
  },
  partyCards: {
    async list(sessionId) {
      return (await posClient.listPosPartyCards(sessionId)).map(mapPosPartyCardDtoToPartyCard);
    },
    async create(sessionId, payload) {
      const dtoPayload: PosPartyCardCreateDto = payload;
      return mapPosPartyCardDtoToPartyCard(await posClient.createPosPartyCard(sessionId, dtoPayload));
    },
    async update(partyCardId, payload) {
      return mapPosPartyCardDtoToPartyCard(await posClient.updatePosPartyCard(partyCardId, payload));
    },
  },
  visits: {
    async list(sessionId) {
      return (await posClient.listPosVisits(sessionId)).map(mapPosVisitDtoToVisit);
    },
    async create(sessionId, payload) {
      const dtoPayload: PosVisitCreateDto = payload;
      return mapPosVisitDtoToVisit(await posClient.createPosVisit(sessionId, dtoPayload));
    },
    async update(visitId, payload) {
      return mapPosVisitDtoToVisit(await posClient.updatePosVisit(visitId, payload));
    },
  },
  orders: {
    async list(sessionId) {
      return (await posClient.listPosOrders(sessionId)).map(mapPosOrderDtoToOrder);
    },
    async create(sessionId, payload) {
      const dtoPayload: PosOrderCreateDto = payload;
      return mapPosOrderDtoToOrder(await posClient.createPosOrder(sessionId, dtoPayload));
    },
    async update(orderId, payload) {
      return mapPosOrderDtoToOrder(await posClient.updatePosOrder(orderId, payload));
    },
  },
  payments: {
    async list(sessionId) {
      return (await posClient.listPosPayments(sessionId)).map(mapPosPaymentDtoToPayment);
    },
    async create(sessionId, payload) {
      const dtoPayload: PosPaymentCreateDto = payload;
      return mapPosPaymentDtoToPayment(await posClient.createPosPayment(sessionId, dtoPayload));
    },
    async cancel(paymentId) {
      return mapPosPaymentDtoToPayment(await posClient.cancelPosPayment(paymentId));
    },
    async restore(paymentId) {
      return mapPosPaymentDtoToPayment(await posClient.restorePosPayment(paymentId));
    },
  },
  devices: {
    async list(sessionId) {
      return (await posClient.listPosDevices(sessionId)).map(mapPosStaffDeviceDtoToStaffDevice);
    },
    async create(sessionId, payload) {
      return mapPosStaffDeviceDtoToStaffDevice(await posClient.createPosDevice(sessionId, payload));
    },
    async delete(deviceId) {
      await posClient.deletePosDevice(deviceId);
    },
  },
  qrFallback: {
    async createRegistration(sessionId, payload) {
      return posClient.createPosQrOrderRegistration(sessionId, payload);
    },
    async listRegisteredKeys(_sessionId) {
      // TODO Phase 13C-8: add backend list endpoint if operators need idempotency-key inspection.
      return [];
    },
  },
  timeLogs: {
    async listByVisit(_visitId): Promise<TimeAdjustmentLog[]> {
      // TODO Phase 13C: call backend POS time-log endpoint once exposed.
      return [];
    },
    async listBySession(_sessionId): Promise<Record<string, TimeAdjustmentLog[]>> {
      // TODO Phase 13C: call backend POS time-log endpoint once exposed.
      return {};
    },
  },
};

// Keep these mapper references compiled in Phase 13B; store migration will use them in Phase 13C.
void mapTableToPosTableCreateDto;
void mapVisitToPosVisitCreateDto;
void mapOrderToPosOrderCreateDto;
void mapPaymentToPosPaymentCreateDto;
void mapPartyCardToPosPartyCardCreateDto;
