import { API_BASE_URL } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";
const MUTATING_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  headers?: HeadersInit;
}

export class ApiClientError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

export class ApiNetworkError extends Error {
  cause: unknown;

  constructor(cause: unknown) {
    super("NETWORK_ERROR");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

function toRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
  ) {
    return body;
  }

  return JSON.stringify(body);
}

function isJsonBody(body: unknown) {
  return (
    body !== undefined &&
    body !== null &&
    typeof body !== "string" &&
    !(typeof FormData !== "undefined" && body instanceof FormData) &&
    !(typeof Blob !== "undefined" && body instanceof Blob) &&
    !(typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams)
  );
}

function getRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window !== "undefined" && path.startsWith("/api/")) return path;
  return `${API_BASE_URL}${path}`;
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(prefix.length));
}

function csrfCookieNameFor(path: string) {
  return path.startsWith("/api/auth/refresh") ? "csrf_refresh_token" : "csrf_access_token";
}

function attachCsrfHeader(headers: Headers, path: string, method: HttpMethod) {
  if (!MUTATING_METHODS.has(method) || headers.has(CSRF_HEADER_NAME)) return;

  const csrfToken = getCookieValue(csrfCookieNameFor(path));
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
}

async function refreshAuthSession() {
  try {
    const headers = new Headers();
    attachCsrfHeader(headers, "/api/auth/refresh", "POST");

    const response = await fetch(getRequestUrl("/api/auth/refresh"), {
      method: "POST",
      headers,
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function authenticatedFetch(path: string, options: RequestOptions = {}, retryOnUnauthorized = true) {
  const { method = "GET", body, headers: customHeaders, auth = false } = options;

  const headers = new Headers(customHeaders);

  if (isJsonBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  attachCsrfHeader(headers, path, method);

  let response: Response;

  try {
    response = await fetch(getRequestUrl(path), {
      method,
      headers,
      credentials: "include",
      body: toRequestBody(body),
    });
  } catch (error) {
    throw new ApiNetworkError(error);
  }

  if (
    response.status === 401 &&
    auth &&
    retryOnUnauthorized &&
    !path.startsWith("/api/auth/refresh") &&
    await refreshAuthSession()
  ) {
    // HttpOnly 쿠키 기반 인증이라 401을 받으면 refresh 쿠키로 세션을 갱신한 뒤 한 번만 재시도한다.
    return authenticatedFetch(path, options, false);
  }

  return response;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const response = await authenticatedFetch(path, options);

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiClientError(result?.message || "요청 처리 중 오류가 발생했습니다.", response.status, result);
  }

  if (result && typeof result === "object" && "data" in result) {
    return result;
  }

  return {
    success: true,
    message: "요청이 완료되었습니다.",
    data: result as T,
  };
}

export async function apiBlobClient(
  path: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const response = await authenticatedFetch(path, {
    ...options,
    method: options.method ?? "GET",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiClientError(
      payload?.message || "파일 다운로드에 실패했습니다.",
      response.status,
      payload,
    );
  }

  return response.blob();
}
