/**
 * Thin fetch wrapper for the ClubX backend (KUBA-LMS).
 *
 * - Base URL comes from `NEXT_PUBLIC_CLUBX_API_BASE`.
 * - All responses are parsed as JSON; non-2xx throws an Error with a readable message.
 */

const API_BASE = process.env.NEXT_PUBLIC_CLUBX_API_BASE ?? "";

export function getApiBase(): string {
  return API_BASE.replace(/\/+$/, "");
}

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

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  anonymous?: boolean;
};

function buildUrl(path: string, query?: FetchOptions["query"]): string {
  const base = getApiBase();
  if (!base) {
    throw new ApiError(
      "API base URL is not configured. Set NEXT_PUBLIC_CLUBX_API_BASE.",
      0,
    );
  }
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${trimmed}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", body, query } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? `Network error: ${err.message}` : "Network error",
      0,
    );
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const detail =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? (parsed as { detail: unknown }).detail
        : parsed) ?? response.statusText;
    const message =
      typeof detail === "string"
        ? detail
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, query?: FetchOptions["query"]) =>
    apiFetch<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
