import type {
  BusinessSession,
  Order,
  OrderItem,
  PartyCard,
  Payment,
  StaffDevice,
  Table,
  TableSize,
  Visit,
} from "@/types";
import type {
  PosBusinessSessionDto,
  PosOrderCreateDto,
  PosOrderDto,
  PosPartyCardCreateDto,
  PosPartyCardDto,
  PosPaymentCreateDto,
  PosPaymentDto,
  PosStaffDeviceDto,
  PosTableCreateDto,
  PosTableDto,
  PosVisitCreateDto,
  PosVisitDto,
} from "@/types/posApi";

const tableSize = (value: number | string): TableSize => {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 3 ? parsed : 1;
};

export function mapPosSessionDtoToBusinessSession(dto: PosBusinessSessionDto): BusinessSession {
  return {
    id: dto.id,
    name: dto.name,
    createdAt: dto.created_at ?? dto.opened_at,
    lastAccessedAt: null,
  };
}

export function mapPosTableDtoToTable(dto: PosTableDto): Table {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    number: dto.number,
    status: dto.status === "occupied" || dto.status === "cleaning" ? dto.status : "empty",
    size: tableSize(dto.visual_size),
    minCapacity: dto.min_capacity,
    maxCapacity: dto.max_capacity,
    x: dto.x,
    y: dto.y,
    mergedGroupId: dto.merged_group_id ?? undefined,
    originalPosition:
      dto.original_x !== null &&
      dto.original_x !== undefined &&
      dto.original_y !== null &&
      dto.original_y !== undefined
        ? { x: dto.original_x, y: dto.original_y }
        : undefined,
  };
}

export function mapTableToPosTableCreateDto(table: Table): PosTableCreateDto {
  return {
    number: table.number,
    min_capacity: table.minCapacity,
    max_capacity: table.maxCapacity,
    x: table.x,
    y: table.y,
    visual_size: table.size,
    original_x: table.originalPosition?.x ?? null,
    original_y: table.originalPosition?.y ?? null,
  };
}

export function mapPosOrderDtoToOrder(dto: PosOrderDto): Order {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    visitId: dto.visit_id,
    segmentId: dto.segment_id ?? undefined,
    orderNumber: dto.order_number,
    orderedBy: {
      type: dto.ordered_by_type === "handy" ? "handy" : "counter",
      name: dto.ordered_by_name,
    },
    orderType:
      dto.order_type === "additional" || dto.order_type === "modified" ? dto.order_type : "initial",
    items: dto.items.map(mapPosOrderItemDtoToOrderItem),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function mapPosOrderItemDtoToOrderItem(item: PosOrderDto["items"][number]): OrderItem {
  return {
    id: item.id,
    menuItemId: item.menu_item_id,
    // Snapshot fields are intentionally copied from the order item, not the live menu.
    menuName: item.menu_name,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    serviceQuantity: item.service_quantity,
    cancelledQuantity: item.cancelled_quantity,
    paidQuantity: item.paid_quantity,
  };
}

export function mapOrderToPosOrderCreateDto(order: Order): PosOrderCreateDto {
  return {
    visit_id: order.visitId,
    ordered_by_type: order.orderedBy.type,
    ordered_by_name: order.orderedBy.name,
    order_type: order.orderType,
    items: order.items.map((item) => ({
      id: item.id,
      menu_item_id: item.menuItemId,
      menu_name: item.menuName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      service_quantity: item.serviceQuantity,
      cancelled_quantity: item.cancelledQuantity,
      paid_quantity: item.paidQuantity,
    })),
  };
}

export function mapPosPaymentDtoToPayment(dto: PosPaymentDto): Payment {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    visitId: dto.visit_id,
    tableLabel: dto.table_label,
    segmentId: dto.segment_id ?? undefined,
    paidAt: dto.paid_at,
    items: (dto.items ?? []).map((item) => ({
      menuItemId: item.menu_item_id ?? undefined,
      menuName: item.menu_name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      amount: item.amount,
      discountAmount: item.discount_amount,
    })),
    totalAmount: dto.total_amount,
    discountAmount: dto.discount_amount,
    status: dto.status === "cancelled" ? "cancelled" : "paid",
    isPrepaid: dto.is_prepaid,
  };
}

export function mapPaymentToPosPaymentCreateDto(payment: Payment): PosPaymentCreateDto {
  return {
    visit_id: payment.visitId,
    table_label: payment.tableLabel,
    items: payment.items.map((item) => ({
      menu_item_id: item.menuItemId ?? null,
      menu_name: item.menuName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      amount: item.amount,
      discount_amount: item.discountAmount,
    })),
    total_amount: payment.totalAmount,
    discount_amount: payment.discountAmount,
    is_prepaid: payment.isPrepaid,
  };
}

export function mapPosPartyCardDtoToPartyCard(dto: PosPartyCardDto): PartyCard {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    type: dto.type === "waiting" || dto.type === "walkIn" ? dto.type : "reservation",
    code: dto.code,
    reservationTime: dto.reservation_time ?? undefined,
    waitingOrder: dto.waiting_order ?? undefined,
    guests: (dto.guests ?? []).map((guest, index) => ({
      id: guest.id ?? `${dto.id}:guest:${index}`,
      name: guest.name,
      phone: guest.phone ?? undefined,
      username: guest.username ?? undefined,
      checkedIn: guest.checked_in,
    })),
    guestCount: dto.guest_count ?? undefined,
    tableCount: dto.table_count,
    status:
      dto.status === "seated" || dto.status === "completed" || dto.status === "overdue"
        ? dto.status
        : "waiting",
    sourceId: dto.source_id ?? undefined,
    mappedTableIds: dto.mapped_table_ids ?? [],
    upstreamStatus: dto.upstream_status ?? undefined,
  };
}

export function mapPartyCardToPosPartyCardCreateDto(card: PartyCard): PosPartyCardCreateDto {
  return {
    type: card.type,
    code: card.code,
    reservation_time: card.reservationTime ?? null,
    waiting_order: card.waitingOrder ?? null,
    guests: card.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      phone: guest.phone ?? null,
      username: guest.username ?? null,
      checked_in: guest.checkedIn,
    })),
    guest_count: card.guestCount ?? card.guests.length,
    table_count: card.tableCount,
    status: card.status,
    source_id: card.sourceId ?? null,
    upstream_status: card.upstreamStatus ?? null,
  };
}

export function mapPosVisitDtoToVisit(dto: PosVisitDto): Visit {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    tableIds: dto.table_ids ?? [],
    partyCardIds: dto.party_card_ids ?? [],
    sourceType:
      dto.source_type === "waiting" ||
      dto.source_type === "walkIn" ||
      dto.source_type === "joined"
        ? dto.source_type
        : "reservation",
    sourceId: undefined,
    visitCode: dto.visit_code,
    startedAt: dto.started_at,
    expectedEndAt: dto.expected_end_at,
    status:
      dto.status === "paid" || dto.status === "cleaning" || dto.status === "completed"
        ? dto.status
        : "active",
    isJoined: dto.is_joined,
    joinedAt: dto.joined_at ?? undefined,
  };
}

export function mapVisitToPosVisitCreateDto(visit: Visit): PosVisitCreateDto {
  return {
    table_ids: visit.tableIds,
    party_card_ids: visit.partyCardIds,
    source_type: visit.sourceType,
    visit_code: visit.visitCode,
    started_at: visit.startedAt,
    expected_end_at: visit.expectedEndAt,
    status: visit.status,
    is_joined: visit.isJoined,
    joined_at: visit.joinedAt ?? null,
  };
}

export function mapPosStaffDeviceDtoToStaffDevice(dto: PosStaffDeviceDto): StaffDevice {
  return {
    id: dto.id,
    sessionId: dto.session_id,
    activationCode: dto.activation_code,
    staffName: dto.staff_name,
    deviceName: dto.device_name ?? undefined,
    connectedAt: dto.connected_at,
    status: dto.status === "deleted" ? "kicked" : "active",
  };
}
