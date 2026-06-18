import type { LoginResponse, User, UserRole, UserStatus } from "@/lib/types";

type BackendUser = Partial<User> & {
  real_name?: string | null;
  profile_img_url?: string | null;
  active?: boolean;
  email_verified?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type RawLoginResponse = Partial<LoginResponse> & {
  access_token?: string;
  member?: BackendUser;
};

function normalizeRole(role: unknown): UserRole {
  return String(role || "USER").toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

function normalizeStatus(status: unknown, active?: boolean): UserStatus {
  if (typeof status === "string") {
    const upperStatus = status.toUpperCase();
    if (upperStatus === "SUSPENDED" || upperStatus === "WITHDRAWN") {
      return upperStatus;
    }
  }

  return active === false ? "WITHDRAWN" : "ACTIVE";
}

export function normalizeUser(rawUser: BackendUser): User {
  const nickname = rawUser.nickname || rawUser.name || rawUser.real_name || "";

  return {
    id: rawUser.id ?? "",
    email: rawUser.email ?? "",
    nickname,
    name: rawUser.name || rawUser.real_name || nickname,
    phone: rawUser.phone,
    role: normalizeRole(rawUser.role),
    status: normalizeStatus(rawUser.status, rawUser.active),
    provider: rawUser.provider,
    createdAt: rawUser.createdAt || rawUser.created_at || undefined,
  };
}

export function normalizeLoginResponse(rawResponse: RawLoginResponse): LoginResponse {
  const accessToken = rawResponse.accessToken || rawResponse.access_token;
  const user = rawResponse.user || rawResponse.member;

  if (!accessToken || !user) {
    throw new Error("로그인 응답 형식이 올바르지 않습니다.");
  }

  return {
    accessToken,
    user: normalizeUser(user),
  };
}
