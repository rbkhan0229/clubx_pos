/** Format an ISO timestamp in Asia/Seoul, used by all admin pub-reservation views. */
export function formatKstDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatKstTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Map an ApiError-like error to an operator-facing Korean message. */
export function describeAdminApiError(err: unknown): string {
  const e = err as { status?: number; message?: string } | undefined;
  const status = e?.status;
  if (status === 401 || status === 403) {
    return "백엔드 권한 오류입니다. 관리자 권한 설정을 확인해주세요.";
  }
  if (status === 0) {
    return "백엔드에 연결할 수 없습니다. CORS 및 API 주소(NEXT_PUBLIC_CLUBX_API_BASE)를 확인해주세요.";
  }
  return e?.message ?? "요청을 처리하지 못했습니다.";
}
