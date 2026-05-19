import { api } from "@/lib/api/client";
import type {
  PosBusinessSessionCreateDto,
  PosBusinessSessionDto,
  PosBusinessSessionUpdateDto,
  PosOrderCreateDto,
  PosOrderDto,
  PosOrderUpdateDto,
  PosPartyCardCreateDto,
  PosPartyCardDto,
  PosPartyCardUpdateDto,
  PosPaymentCreateDto,
  PosPaymentDto,
  PosQrOrderRegistrationCreateDto,
  PosQrOrderRegistrationDto,
  PosStaffDeviceCreateDto,
  PosStaffDeviceDto,
  PosTableCreateDto,
  PosTableDto,
  PosTableMergeGroupCreateDto,
  PosTableMergeGroupDto,
  PosTableUpdateDto,
  PosVisitCreateDto,
  PosVisitDto,
  PosVisitUpdateDto,
} from "@/types/posApi";

const POS_BASE = "/pos";

export const posClient = {
  listPosSessions: () => api.get<PosBusinessSessionDto[]>(`${POS_BASE}/sessions`),
  createPosSession: (payload: PosBusinessSessionCreateDto) =>
    api.post<PosBusinessSessionDto>(`${POS_BASE}/sessions`, payload),
  getPosSession: (sessionId: string) =>
    api.get<PosBusinessSessionDto>(`${POS_BASE}/sessions/${sessionId}`),
  updatePosSession: (sessionId: string, payload: PosBusinessSessionUpdateDto) =>
    api.patch<PosBusinessSessionDto>(`${POS_BASE}/sessions/${sessionId}`, payload),
  closePosSession: (sessionId: string) =>
    api.post<PosBusinessSessionDto>(`${POS_BASE}/sessions/${sessionId}/close`),

  listPosTables: (sessionId: string) =>
    api.get<PosTableDto[]>(`${POS_BASE}/sessions/${sessionId}/tables`),
  createPosTable: (sessionId: string, payload: PosTableCreateDto) =>
    api.post<PosTableDto>(`${POS_BASE}/sessions/${sessionId}/tables`, payload),
  updatePosTable: (tableId: string, payload: PosTableUpdateDto) =>
    api.patch<PosTableDto>(`${POS_BASE}/tables/${tableId}`, payload),
  deletePosTable: (tableId: string) => api.delete<{ ok: boolean }>(`${POS_BASE}/tables/${tableId}`),

  listPosMergeGroups: (sessionId: string) =>
    api.get<PosTableMergeGroupDto[]>(`${POS_BASE}/sessions/${sessionId}/merge-groups`),
  createPosMergeGroup: (sessionId: string, payload: PosTableMergeGroupCreateDto) =>
    api.post<PosTableMergeGroupDto>(`${POS_BASE}/sessions/${sessionId}/merge-groups`, payload),
  splitPosMergeGroup: (groupId: string) =>
    api.post<PosTableMergeGroupDto>(`${POS_BASE}/merge-groups/${groupId}/split`),

  listPosPartyCards: (sessionId: string) =>
    api.get<PosPartyCardDto[]>(`${POS_BASE}/sessions/${sessionId}/party-cards`),
  createPosPartyCard: (sessionId: string, payload: PosPartyCardCreateDto) =>
    api.post<PosPartyCardDto>(`${POS_BASE}/sessions/${sessionId}/party-cards`, payload),
  updatePosPartyCard: (partyCardId: string, payload: PosPartyCardUpdateDto) =>
    api.patch<PosPartyCardDto>(`${POS_BASE}/party-cards/${partyCardId}`, payload),

  listPosVisits: (sessionId: string) =>
    api.get<PosVisitDto[]>(`${POS_BASE}/sessions/${sessionId}/visits`),
  createPosVisit: (sessionId: string, payload: PosVisitCreateDto) =>
    api.post<PosVisitDto>(`${POS_BASE}/sessions/${sessionId}/visits`, payload),
  updatePosVisit: (visitId: string, payload: PosVisitUpdateDto) =>
    api.patch<PosVisitDto>(`${POS_BASE}/visits/${visitId}`, payload),

  listPosOrders: (sessionId: string) =>
    api.get<PosOrderDto[]>(`${POS_BASE}/sessions/${sessionId}/orders`),
  createPosOrder: (sessionId: string, payload: PosOrderCreateDto) =>
    api.post<PosOrderDto>(`${POS_BASE}/sessions/${sessionId}/orders`, payload),
  updatePosOrder: (orderId: string, payload: PosOrderUpdateDto) =>
    api.patch<PosOrderDto>(`${POS_BASE}/orders/${orderId}`, payload),

  listPosPayments: (sessionId: string) =>
    api.get<PosPaymentDto[]>(`${POS_BASE}/sessions/${sessionId}/payments`),
  createPosPayment: (sessionId: string, payload: PosPaymentCreateDto) =>
    api.post<PosPaymentDto>(`${POS_BASE}/sessions/${sessionId}/payments`, payload),
  cancelPosPayment: (paymentId: string) =>
    api.post<PosPaymentDto>(`${POS_BASE}/payments/${paymentId}/cancel`),
  restorePosPayment: (paymentId: string) =>
    api.post<PosPaymentDto>(`${POS_BASE}/payments/${paymentId}/restore`),

  listPosDevices: (sessionId: string) =>
    api.get<PosStaffDeviceDto[]>(`${POS_BASE}/sessions/${sessionId}/devices`),
  createPosDevice: (sessionId: string, payload: PosStaffDeviceCreateDto) =>
    api.post<PosStaffDeviceDto>(`${POS_BASE}/sessions/${sessionId}/devices`, payload),
  deletePosDevice: (deviceId: string) =>
    api.post<PosStaffDeviceDto>(`${POS_BASE}/devices/${deviceId}/delete`),

  createPosQrOrderRegistration: (
    sessionId: string,
    payload: PosQrOrderRegistrationCreateDto,
  ) =>
    api.post<PosQrOrderRegistrationDto>(
      `${POS_BASE}/sessions/${sessionId}/qr-order-registrations`,
      payload,
    ),
};

export type PosClient = typeof posClient;
