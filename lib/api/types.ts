/** Shared types for POS admin pub-reservation views. */

export type ReservationStatus = "submitted" | "checked_in" | "cancelled";

export type AdminGuest = {
  guest_type: "non_clubx" | "clubx";
  name: string | null;
  phone_masked: string | null;
  /** Unmasked phone (POS admin view only). */
  phone?: string | null;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
};

export type AdminReservation = {
  id: string;
  reservation_code: string;
  status: ReservationStatus | string;
  event_id: string;
  service_date: string;
  start_minute: number;
  end_minute: number;
  start_label: string;
  end_label: string;
  total_party_size: number;
  table_count: number;
  non_clubx_count: number;
  clubx_count: number;
  contact_name: string;
  contact_phone_masked: string;
  /** Unmasked phone (POS admin view only). */
  contact_phone?: string | null;
  created_at: string;
  guests: AdminGuest[];
};

export type AdminReservationListResponse = {
  total: number;
  items: AdminReservation[];
};

export type WaitlistStatus =
  | "waiting"
  | "called"
  | "seated"
  | "no_show"
  | "cancelled"
  | "left";

export type AdminWaitlistEntry = {
  id: string;
  waiting_code: string;
  queue_number: number;
  event_id: string;
  preferred_start_minute: number | null;
  preferred_end_minute: number | null;
  preferred_start_label: string | null;
  preferred_end_label: string | null;
  name: string;
  phone_masked: string;
  /** Unmasked phone (POS admin view only). */
  phone?: string | null;
  party_size: number;
  required_tables: number;
  status: WaitlistStatus | string;
  called_at: string | null;
  seated_at: string | null;
  created_at: string;
};

export type AdminWaitlistListResponse = {
  total: number;
  current_called_number: number;
  items: AdminWaitlistEntry[];
};

export type AdminWaitlistOverview = {
  event_id: string | null;
  walkin_table_quota: number;
  occupied_tables: number;
  available_tables: number;
  waiting_count: number;
  called_count: number;
  seated_count: number;
  current_called_number: number;
};

export type AdminWaitlistNextCallableEntry = {
  id: string;
  queue_number: number;
  waiting_code: string;
  name: string;
  phone_masked: string;
  /** Unmasked phone (POS admin view only). */
  phone?: string | null;
  party_size: number;
  required_tables: number;
};

export type AdminWaitlistCallNextResponse = {
  called: AdminWaitlistNextCallableEntry[];
  available_tables_after: number;
  current_called_number: number;
};

/**
 * Display a phone value as-is when it is already masked by the backend
 * (contains an asterisk), otherwise format raw digits with hyphens.
 */
export function displayPhone(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes("*")) return str;
  const digits = str.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * POS admin views show the full unmasked phone when available; fall back to
 * the masked value (e.g. `010-****-5739`) only when the backend did not
 * supply a raw phone (older records or non-admin endpoints).
 */
export function displayFullPhone(
  raw: string | null | undefined,
  masked: string | null | undefined,
): string {
  if (raw) return displayPhone(raw);
  return displayPhone(masked);
}
