import { API_BASE_URL, USE_MOCK } from "@/lib/constants";
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

function createMockUser(email: string, nickname = "필터리 사용자"): User {
  return {
    id: "mock-user",
    email,
    nickname,
    name: nickname,
    role: "USER",
    status: "ACTIVE",
    provider: "local",
    createdAt: new Date().toISOString(),
  };
}

export const authService = {
  async loginWithEmail(email: string, password: string) {
    try {
      const result = await apiClient<unknown>("/api/auth/login", {
        method: "POST",
        body: { email, password },
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
          user: createMockUser(email),
        },
      };
    }
  },

  login(payload: LoginRequest) {
    return this.loginWithEmail(payload.email, payload.password);
  },

  async signupWithEmail(payload: SignupPayload) {
    try {
      const result = await apiClient<unknown>("/api/auth/register", {
        method: "POST",
        body: payload,
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
        data: createMockUser(payload.email, payload.nickname),
      };
    }
  },

  signup(payload: SignupRequest) {
    return this.signupWithEmail({
      email: payload.email,
      password: payload.password,
      nickname: payload.nickname ?? payload.name ?? "",
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
    return apiClient<null>("/api/auth/refresh", {
      method: "POST",
    });
  },

  logout() {
    return apiClient<null>("/api/auth/logout", {
      method: "POST",
      auth: true,
    });
  },

  socialLogin(provider: SocialProvider) {
    this.startSocialLogin(provider);
  },

  findId(payload: FindIdRequest) {
    return apiClient<FindIdResponse>("/api/members/find-email", {
      method: "POST",
      body: payload,
    });
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

  startSocialLogin(provider: SocialProvider) {
    const nextUrl = `${window.location.origin}/auth/callback`;
    const url = `${API_BASE_URL}/api/auth/social-login?provider=${provider}&next=${encodeURIComponent(
      nextUrl
    )}`;

    window.location.href = url;
  },

};
