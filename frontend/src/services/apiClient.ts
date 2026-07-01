import { API_BASE_URL } from "@/lib/constants";
import { readAccessToken, readRefreshToken } from "@/lib/authStorage";
import type { ApiResponse } from "@/lib/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  tokenType?: "access" | "refresh";
  headers?: HeadersInit;
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

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, auth = false, tokenType = "access", headers: customHeaders } = options;

  const headers = new Headers(customHeaders);
  const token = tokenType === "refresh" ? readRefreshToken() : readAccessToken();

  if (isJsonBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: toRequestBody(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "요청 처리 중 오류가 발생했습니다.");
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
