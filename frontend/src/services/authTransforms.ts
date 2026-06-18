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
  member?: BackendUser;
};

function textOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackNameFromEmail(email: string) {
  return email.includes("@") ? email.split("@")[0] : "";
}

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
  const email = textOrEmpty(rawUser.email);
  const nickname =
    textOrEmpty(rawUser.nickname) ||
    textOrEmpty(rawUser.name) ||
    textOrEmpty(rawUser.real_name) ||
    fallbackNameFromEmail(email) ||
    "Filtory 사용자";

  return {
    id: rawUser.id ?? "",
    email,
    nickname,
    name: textOrEmpty(rawUser.name) || textOrEmpty(rawUser.real_name) || nickname,
    phone: rawUser.phone,
    role: normalizeRole(rawUser.role),
    status: normalizeStatus(rawUser.status, rawUser.active),
    provider: rawUser.provider,
    createdAt: rawUser.createdAt || rawUser.created_at || undefined,
  };
}

export function normalizeLoginResponse(rawResponse: RawLoginResponse): LoginResponse {
  const user = rawResponse.user || rawResponse.member;

  if (!user) {
    throw new Error("로그인 응답 형식이 올바르지 않습니다.");
  }

  return {
    user: normalizeUser(user),
  };
}
