import { API_BASE_URL, USE_MOCK } from "@/lib/constants";
import { sanitizeInternalNextPath } from "@/lib/navigation";
import type {
  FindIdRequest,
  FindIdResponse,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupPayload,
  SignupRequest,
  SocialProvider,
  User,
} from "@/lib/types";
import { apiClient } from "./apiClient";
import { normalizeLoginResponse, normalizeUser } from "./authTransforms";

type BackendSignupPayload = {
  email: string;
  login_id: string;
  password: string;
  nickname: string;
  real_name: string;
  phone: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

function createMockUser(email: string, nickname = "필터리 사용자", name = nickname): User {
  return {
    id: "mock-user",
    email,
    nickname,
    name,
    phone: undefined,
    role: "USER",
    status: "ACTIVE",
    provider: "local",
    profileImageUrl: null,
    socialProviders: {
      google: false,
      naver: false,
      kakao: false,
    },
    emailVerified: false,
    hasPassword: true,
    joinedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    analysisCount: 0,
    savedHospitalCount: 0,
    reportCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export const authService = {
  async loginWithIdentifier(identifier: string, password: string) {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);

    try {
      const result = await apiClient<unknown>("/api/auth/login", {
        method: "POST",
        body: { identifier: normalizedIdentifier, password },
      });

      return {
        ...result,
        data: normalizeLoginResponse(result.data),
      };
    } catch (error) {
      if (!USE_MOCK) {
        throw error instanceof Error ? error : new Error("로그인에 실패했습니다.");
      }

      // 백엔드 연결 전에도 프론트 흐름을 확인할 수 있는 임시 fallback입니다.
      return {
        success: true,
        message: "로그인되었습니다.",
        data: {
          user: createMockUser(
            normalizedIdentifier.includes("@") ? normalizedIdentifier : "filtory.user@example.com",
            normalizedIdentifier
          ),
        },
      };
    }
  },

  login(payload: LoginRequest) {
    return this.loginWithIdentifier(payload.identifier, payload.password);
  },

  async signupWithEmail(payload: SignupPayload) {
    try {
      const result = await apiClient<unknown>("/api/auth/register", {
        method: "POST",
        body: toBackendSignupPayload(payload),
      });

      return {
        ...result,
        data: normalizeLoginResponse(result.data).user,
      };
    } catch (error) {
      if (!USE_MOCK) {
        throw error instanceof Error ? error : new Error("회원가입에 실패했습니다.");
      }

      return {
        success: true,
        message: "회원가입이 완료되었습니다.",
        data: {
          ...createMockUser(payload.email, payload.nickname ?? payload.loginId, payload.name),
          phone: payload.phone,
        },
      };
    }
  },

  signup(payload: SignupRequest) {
    return this.signupWithEmail({
      email: payload.email,
      loginId: payload.loginId,
      password: payload.password,
      name: payload.name,
      phone: payload.phone,
      nickname: payload.nickname,
      termsAgreed: payload.termsAgreed,
      privacyAgreed: payload.privacyAgreed,
      marketingAgreed: payload.marketingAgreed,
    });
  },

  me() {
    return apiClient<unknown>("/api/auth/me", {
      method: "GET",
      auth: true,
    }).then((result) => ({
      ...result,
      data: normalizeUser(result.data as User),
    }));
  },

  refresh() {
    return apiClient<unknown>("/api/auth/refresh", {
      method: "POST",
      auth: true,
    });
  },

  logout() {
    return apiClient<null>("/api/auth/logout", {
      method: "POST",
      auth: true,
    });
  },

  socialLogin(provider: SocialProvider, nextPath?: string | null) {
    this.startSocialLogin(provider, nextPath);
  },

  findId(payload: FindIdRequest) {
    return apiClient<FindIdResponse>("/api/members/find-id", {
      method: "POST",
      body: {
        real_name: payload.name,
        phone: payload.phone,
      },
    })
  },

  forgotPassword(payload: ForgotPasswordRequest) {
    return apiClient<null>("/api/auth/password-reset/request", {
      method: "POST",
      body: payload,
    });
  },

  resetPassword(payload: ResetPasswordRequest) {
    return apiClient<null>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: payload,
    });
  },

  startSocialLogin(provider: SocialProvider, nextPath?: string | null) {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    const safeNextPath = sanitizeInternalNextPath(nextPath);
    if (safeNextPath) {
      callbackUrl.searchParams.set("next", safeNextPath);
    }
    const nextUrl = callbackUrl.toString();
    const url = `${API_BASE_URL}/api/auth/social-login?provider=${provider}&next=${encodeURIComponent(
      nextUrl
    )}`;

    window.location.href = url;
  },

};

function toBackendSignupPayload(payload: SignupPayload): BackendSignupPayload {
  return {
    email: normalizeEmail(payload.email),
    login_id: payload.loginId,
    password: payload.password,
    nickname: payload.nickname ?? payload.loginId,
    real_name: payload.name,
    phone: payload.phone,
    termsAgreed: payload.termsAgreed,
    privacyAgreed: payload.privacyAgreed,
    marketingAgreed: payload.marketingAgreed,
  };
}
