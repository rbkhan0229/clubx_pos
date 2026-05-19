const DEFAULT_API_BASE = "https://club-lms-for-kuba-production.up.railway.app/api/v1";
const TOKEN_KEY = "clubx_admin_token";

type QueryValue = string | number | boolean | null | undefined;

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_CLUBX_API_BASE?.trim();
  return (configured || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, QueryValue>;
  } = {},
) {
  const token = getAdminToken();
  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail?: unknown }).detail
        : payload;
    throw new ApiError(
      typeof detail === "string" ? detail : `API request failed (${response.status})`,
      response.status,
      detail,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>) =>
    request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
