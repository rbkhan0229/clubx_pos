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
  TimeAdjustmentLog,
  Visit,
  WaitingSite,
} from "@/types";

export type PosBusinessSessionStatus = "active" | "closed" | "archived";

export type PosBusinessSessionDto = {
  id: string;
  name: string;
  status: PosBusinessSessionStatus;
  opened_at: string;
  closed_at?: string | null;
  created_by_user_id?: string | null;
  source_event_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PosBusinessSessionCreateDto = {
  name: string;
  opened_at?: string;
  created_by_user_id?: string | null;
  source_event_id?: string | null;
  notes?: string | null;
};

export type PosBusinessSessionUpdateDto = Partial<{
  name: string;
  status: PosBusinessSessionStatus;
  closed_at: string | null;
  notes: string | null;
}>;

export type PosTableDto = {
  id: string;
  session_id: string;
  number: string;
  status: Table["status"] | string;
  min_capacity: number;
  max_capacity: number;
  visual_size: Table["size"] | number;
  x: number;
  y: number;
  merged_group_id?: string | null;
  original_x?: number | null;
  original_y?: number | null;
  created_at: string;
  updated_at: string;
};

export type PosTableCreateDto = {
  number: string;
  status?: Table["status"] | string;
  min_capacity: number;
  max_capacity: number;
  visual_size: Table["size"] | number;
  x: number;
  y: number;
  original_x?: number | null;
  original_y?: number | null;
};

export type PosTableUpdateDto = Partial<{
  number: string;
  status: Table["status"] | string;
  min_capacity: number;
  max_capacity: number;
  visual_size: Table["size"] | number;
  x: number;
  y: number;
  merged_group_id: string | null;
  original_x: number | null;
  original_y: number | null;
}>;

export type PosTableMergeGroupDto = {
  id: string;
  session_id: string;
  label: string;
  status: string;
  created_at: string;
  table_ids: string[];
};

export type PosTableMergeGroupCreateDto = {
  label: string;
  status?: string;
  table_ids: string[];
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
  id?: string;
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
  status: PartyCard["status"] | string;
  reservation_time?: string | null;
  waiting_order?: number | null;
  guest_count?: number | null;
  table_count: number;
  source_type?: string | null;
  source_id?: string | null;
  upstream_status?: string | null;
  created_at: string;
  updated_at: string;
  guests?: PosPartyCardGuestDto[];
  mapped_table_ids?: string[];
};

export type PosPartyCardCreateDto = {
  type: PartyCard["type"] | string;
  code: string;
  status?: PartyCard["status"] | string;
  reservation_time?: string | null;
  waiting_order?: number | null;
  guest_count?: number;
  table_count?: number;
  source_type?: string | null;
  source_id?: string | null;
  upstream_status?: string | null;
  guests?: PosPartyCardGuestDto[];
};

export type PosPartyCardUpdateDto = Partial<Omit<PosPartyCardCreateDto, "guests">>;

export type PosVisitDto = {
  id: string;
  session_id: string;
  visit_code: string;
  source_type: Visit["sourceType"] | string;
  status: Visit["status"] | string;
  started_at: string;
  expected_end_at: string;
  completed_at?: string | null;
  is_joined?: boolean;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
  table_ids?: string[];
  party_card_ids?: string[];
};

export type PosVisitCreateDto = {
  visit_code: string;
  source_type: Visit["sourceType"] | string;
  status?: Visit["status"] | string;
  started_at?: string;
  expected_end_at?: string;
  is_joined?: boolean;
  joined_at?: string | null;
  table_ids: string[];
  party_card_ids: string[];
};

export type PosVisitUpdateDto = Partial<{
  source_type: Visit["sourceType"] | string;
  status: Visit["status"] | string;
  expected_end_at: string;
  completed_at: string | null;
  is_joined: boolean;
  joined_at: string | null;
}>;

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
  order_number: number;
  order_type: Order["orderType"] | "qrFallback" | string;
  ordered_by_type: Order["orderedBy"]["type"] | string;
  ordered_by_name: string;
  idempotency_key?: string | null;
  client_generated_order_id?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  items: PosOrderItemDto[];
  segment_id?: string | null;
};

export type PosOrderCreateDto = {
  visit_id: string;
  order_type?: Order["orderType"] | "qrFallback" | string;
  ordered_by_type?: Order["orderedBy"]["type"] | string;
  ordered_by_name?: string;
  idempotency_key?: string | null;
  client_generated_order_id?: string | null;
  source?: string | null;
  items: Array<Omit<PosOrderItemDto, "id"> & { id?: string }>;
};

export type PosOrderUpdateDto = Partial<{
  order_type: Order["orderType"] | "qrFallback" | string;
  ordered_by_type: Order["orderedBy"]["type"] | string;
  ordered_by_name: string;
  idempotency_key: string | null;
  client_generated_order_id: string | null;
  source: string | null;
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
  paid_at: string;
  total_amount: number;
  discount_amount: number;
  status: Payment["status"] | string;
  is_prepaid: boolean;
  restored_at?: string | null;
  cancelled_at?: string | null;
  items?: PosPaymentItemDto[];
  segment_id?: string | null;
};

export type PosPaymentCreateDto = {
  visit_id: string;
  table_label: string;
  total_amount: number;
  discount_amount: number;
  is_prepaid: boolean;
  items: PosPaymentItemDto[];
};

export type PosStaffDeviceDto = {
  id: string;
  session_id: string;
  activation_code: string;
  staff_name: string;
  device_name?: string | null;
  status: "active" | "deleted" | string;
  connected_at: string;
  deleted_at?: string | null;
};

export type PosStaffDeviceCreateDto = {
  activation_code?: string;
  staff_name: string;
  device_name?: string | null;
};

export type PosQrOrderRegistrationDto = {
  id: string;
  session_id: string;
  visit_id?: string | null;
  order_id?: string | null;
  idempotency_key: string;
  payload_json: Record<string, unknown>;
  registered_at: string;
};

export type PosQrOrderRegistrationCreateDto = {
  visit_id?: string | null;
  order_id?: string | null;
  idempotency_key: string;
  payload_json: Record<string, unknown>;
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
