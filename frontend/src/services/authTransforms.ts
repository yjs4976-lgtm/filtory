import type { LoginResponse, User, UserRole, UserStatus } from "@/lib/types";

type BackendUser = Partial<User> & {
  real_name?: string | null;
  profile_img_url?: string | null;
  profile_image_url?: string | null;
  social_providers?: Partial<Record<"google" | "naver" | "kakao", boolean>> | null;
  active?: boolean;
  email_verified?: boolean;
  last_login_at?: string | null;
  password_changed_at?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RawLoginResponse = Partial<LoginResponse> & {
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
  const socialProviders = rawUser.socialProviders || rawUser.social_providers || {};
  const provider = rawUser.provider;

  return {
    id: rawUser.id ?? "",
    email: rawUser.email ?? "",
    nickname,
    name: rawUser.name || rawUser.real_name || nickname,
    phone: rawUser.phone,
    role: normalizeRole(rawUser.role),
    status: normalizeStatus(rawUser.status, rawUser.active),
    provider,
    profileImageUrl: rawUser.profileImageUrl || rawUser.profile_img_url || rawUser.profile_image_url || null,
    socialProviders: {
      google: Boolean(socialProviders.google || provider === "google"),
      naver: Boolean(socialProviders.naver || provider === "naver"),
      kakao: Boolean(socialProviders.kakao || provider === "kakao"),
    },
    emailVerified: rawUser.emailVerified ?? rawUser.email_verified ?? false,
    hasPassword: rawUser.hasPassword ?? (provider === "local" || !provider),
    joinedAt: rawUser.joinedAt || rawUser.createdAt || rawUser.created_at || undefined,
    lastLoginAt: rawUser.lastLoginAt || rawUser.last_login_at || undefined,
    lastActiveAt: rawUser.lastActiveAt,
    analysisCount: rawUser.analysisCount,
    savedHospitalCount: rawUser.savedHospitalCount,
    reportCount: rawUser.reportCount,
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
