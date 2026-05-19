export type AdminReservationStatus =
  | "confirmed"
  | "pending"
  | "pending_approval"
  | "seated"
  | "completed"
  | "cancelled"
  | "deleted"
  | "hidden";

export type AdminReservationGuest = {
  id?: string;
  name: string;
  phone?: string | null;
  phone_masked?: string | null;
  username?: string | null;
  clubx_username?: string | null;
  checked_in?: boolean;
};

export type AdminReservation = {
  id: string;
  reservation_code: string;
  status: AdminReservationStatus | string;
  event_id: string;
  service_date: string;
  start_minute: number;
  end_minute: number;
  start_label: string;
  end_label: string;
  total_party_size: number;
  table_count: number;
  contact_name: string;
  contact_phone?: string | null;
  contact_phone_masked?: string | null;
  created_at: string;
  guests: AdminReservationGuest[];
};

export type AdminReservationListResponse = {
  data?: AdminReservation[];
  items?: AdminReservation[];
  reservations?: AdminReservation[];
  total?: number;
  page?: number;
  limit?: number;
};
