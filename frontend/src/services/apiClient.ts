import { API_BASE_URL, STORAGE_KEYS } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  headers?: HeadersInit;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, auth = false, headers: customHeaders } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth && typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
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
