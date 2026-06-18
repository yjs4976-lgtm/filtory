import { API_BASE_URL } from "@/lib/constants";
import type {
  FindIdRequest,
  FindIdResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  SignupPayload,
  SignupRequest,
  SocialProvider,
  User,
} from "@/lib/types";
import { apiClient } from "./apiClient";

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
      return await apiClient<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
    } catch {
      // 백엔드 연결 전에도 프론트 흐름을 확인할 수 있는 임시 fallback입니다.
      return {
        success: true,
        message: "로그인되었습니다.",
        data: {
          accessToken: "mock-access-token",
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
      return await apiClient<User>("/api/auth/signup", {
        method: "POST",
        body: payload,
      });
    } catch {
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
    return apiClient<User>("/api/auth/me", {
      method: "GET",
      auth: true,
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
    return apiClient<FindIdResponse>("/api/auth/find-id", {
      method: "POST",
      body: payload,
    });
  },

  forgotPassword(payload: ForgotPasswordRequest) {
    return apiClient<null>("/api/auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  resetPassword(payload: ResetPasswordRequest) {
    return apiClient<null>("/api/auth/reset-password", {
      method: "POST",
      body: payload,
    });
  },

  startSocialLogin(provider: SocialProvider) {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const url = `${API_BASE_URL}/api/auth/social/${provider}/login?redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    window.location.href = url;
  },

  socialCallback(provider: SocialProvider, code: string, state?: string) {
    return apiClient<LoginResponse>("/api/auth/social/callback", {
      method: "POST",
      body: {
        provider,
        code,
        state,
      },
    });
  },
};
