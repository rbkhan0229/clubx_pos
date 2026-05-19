import type {
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  PartyCard,
  Payment,
  PaymentItem,
  StaffDevice,
  Table,
  TableMergeGroup,
  TimeAdjustmentLog,
  Visit,
  WaitingSite,
} from "@/types";

export type PosBusinessSessionStatus = "open" | "closed";

export type PosBusinessSessionDto = {
  id: string;
  name: string;
  status: PosBusinessSessionStatus | string;
  opened_at: string;
  closed_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PosBusinessSessionCreateDto = {
  name: string;
  metadata?: Record<string, unknown>;
};

export type PosBusinessSessionUpdateDto = Partial<{
  name: string;
  status: PosBusinessSessionStatus | string;
  last_accessed_at: string | null;
  metadata: Record<string, unknown>;
}>;

export type PosTableDto = {
  id: string;
  session_id: string;
  number: string;
  status: Table["status"] | string;
  size: Table["size"] | number;
  min_capacity: number;
  max_capacity: number;
  x: number;
  y: number;
  merge_group_id?: string | null;
  original_position?: Table["originalPosition"] | null;
  created_at?: string;
  updated_at?: string;
};

export type PosTableCreateDto = {
  number?: string;
  min_capacity: number;
  max_capacity: number;
  x: number;
  y: number;
  size?: Table["size"] | number;
};

export type PosTableUpdateDto = Partial<{
  number: string;
  status: Table["status"] | string;
  size: Table["size"] | number;
  min_capacity: number;
  max_capacity: number;
  x: number;
  y: number;
  merge_group_id: string | null;
  original_position: Table["originalPosition"] | null;
}>;

export type PosTableMergeGroupDto = {
  id: string;
  session_id: string;
  table_ids: string[];
  label: string;
  original_positions: TableMergeGroup["originalPositions"];
  created_at: string;
};

export type PosTableMergeGroupCreateDto = {
  table_ids: string[];
  label?: string;
  original_positions?: TableMergeGroup["originalPositions"];
};

export type PosMenuCategoryDto = {
  id: string;
  session_id: string;
  name_ko: string;
  name_en?: string | null;
  sort_order: number;
};

export type PosMenuCategoryCreateDto = {
  name_ko: string;
  name_en?: string | null;
  sort_order?: number;
};

export type PosMenuItemDto = {
  id: string;
  session_id: string;
  category_id: string;
  name_ko: string;
  name_en?: string | null;
  price: number;
  is_active: boolean;
};

export type PosMenuItemCreateDto = {
  category_id: string;
  name_ko: string;
  name_en?: string | null;
  price: number;
  is_active?: boolean;
};

export type PosPartyCardGuestDto = {
  id: string;
  name: string;
  phone?: string | null;
  username?: string | null;
  checked_in: boolean;
};

export type PosPartyCardDto = {
  id: string;
  session_id: string;
  type: PartyCard["type"] | string;
  code: string;
  reservation_time?: string | null;
  waiting_order?: number | null;
  guests: PosPartyCardGuestDto[];
  guest_count?: number | null;
  table_count: number;
  status: PartyCard["status"] | string;
  source_id?: string | null;
  source_type?: string | null;
  mapped_table_ids?: string[];
  upstream_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PosPartyCardCreateDto = {
  type: PartyCard["type"] | string;
  code: string;
  reservation_time?: string | null;
  waiting_order?: number | null;
  guests?: Array<Omit<PosPartyCardGuestDto, "id"> & { id?: string }>;
  guest_count?: number | null;
  table_count: number;
  status?: PartyCard["status"] | string;
  source_id?: string | null;
  source_type?: string | null;
  mapped_table_ids?: string[];
  upstream_status?: string | null;
};

export type PosPartyCardUpdateDto = Partial<PosPartyCardCreateDto>;

export type PosVisitDto = {
  id: string;
  session_id: string;
  table_ids: string[];
  party_card_ids: string[];
  source_type: Visit["sourceType"] | string;
  source_id?: string | null;
  visit_code: string;
  started_at: string;
  expected_end_at: string;
  status: Visit["status"] | string;
  is_joined?: boolean;
  joined_at?: string | null;
};

export type PosVisitCreateDto = {
  table_ids: string[];
  party_card_ids: string[];
  source_type: Visit["sourceType"] | string;
  source_id?: string | null;
  visit_code: string;
  started_at?: string;
  expected_end_at: string;
  status?: Visit["status"] | string;
  is_joined?: boolean;
  joined_at?: string | null;
};

export type PosVisitUpdateDto = Partial<PosVisitCreateDto>;

export type PosOrderItemDto = {
  id: string;
  menu_item_id: string;
  menu_name: string;
  unit_price: number;
  quantity: number;
  service_quantity: number;
  cancelled_quantity: number;
  paid_quantity: number;
};

export type PosOrderDto = {
  id: string;
  session_id: string;
  visit_id: string;
  segment_id?: string | null;
  order_number: number;
  ordered_by_type: Order["orderedBy"]["type"] | string;
  ordered_by_name: string;
  order_type: Order["orderType"] | string;
  items: PosOrderItemDto[];
  created_at: string;
  updated_at: string;
};

export type PosOrderCreateDto = {
  visit_id: string;
  segment_id?: string | null;
  ordered_by_type?: Order["orderedBy"]["type"] | string;
  ordered_by_name?: string;
  order_type?: Order["orderType"] | string;
  items: Array<Omit<PosOrderItemDto, "id"> & { id?: string }>;
};

export type PosOrderUpdateDto = Partial<{
  segment_id: string | null;
  ordered_by_type: Order["orderedBy"]["type"] | string;
  ordered_by_name: string;
  order_type: Order["orderType"] | string;
  items: Array<Omit<PosOrderItemDto, "id"> & { id?: string }>;
}>;

export type PosPaymentItemDto = {
  menu_item_id?: string | null;
  menu_name: string;
  unit_price: number;
  quantity: number;
  amount: number;
  discount_amount?: number;
};

export type PosPaymentDto = {
  id: string;
  session_id: string;
  visit_id: string;
  table_label: string;
  segment_id?: string | null;
  paid_at: string;
  items: PosPaymentItemDto[];
  total_amount: number;
  discount_amount: number;
  status: Payment["status"] | string;
  is_prepaid: boolean;
};

export type PosPaymentCreateDto = {
  visit_id: string;
  table_label: string;
  segment_id?: string | null;
  items: PosPaymentItemDto[];
  total_amount: number;
  discount_amount: number;
  is_prepaid: boolean;
};

export type PosStaffDeviceDto = {
  id: string;
  session_id: string;
  activation_code: string;
  staff_name: string;
  device_name?: string | null;
  connected_at: string;
  status: StaffDevice["status"] | string;
};

export type PosStaffDeviceCreateDto = {
  activation_code?: string;
  staff_name: string;
  device_name?: string | null;
};

export type PosQrOrderRegistrationDto = {
  id: string;
  session_id: string;
  visit_id: string;
  table_id?: string | null;
  idempotency_key: string;
  staff_name?: string | null;
  items: Array<Pick<OrderItem, "menuItemId" | "menuName" | "unitPrice" | "quantity">>;
  created_order_id?: string | null;
  created_at: string;
};

export type PosQrOrderRegistrationCreateDto = {
  visit_id: string;
  table_id?: string | null;
  idempotency_key: string;
  staff_name?: string | null;
  items: Array<Pick<OrderItem, "menuItemId" | "menuName" | "unitPrice" | "quantity">>;
};

export type PosTimeAdjustmentLogDto = {
  id: string;
  visit_id: string;
  minutes: number;
  message_ko: string;
  message_en: string;
  created_at: string;
};

export type PosWaitingSiteDto = WaitingSite;
export type PosLocalMenuSnapshot = {
  categories: MenuCategory[];
  items: MenuItem[];
  locked: boolean;
};

export type PosLocalQrRegistration = PosQrOrderRegistrationDto;
export type PosDomainOrderItemSnapshot = Pick<OrderItem, "menuItemId" | "menuName" | "unitPrice" | "quantity">;
export type PosDomainPaymentItemSnapshot = PaymentItem;
export type PosDomainTimeLog = TimeAdjustmentLog;
