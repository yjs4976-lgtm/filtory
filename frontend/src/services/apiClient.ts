import { API_BASE_URL } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
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

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers: customHeaders } = options;

  const headers = new Headers(customHeaders);

  if (isJsonBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

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
