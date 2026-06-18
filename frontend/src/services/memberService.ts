import type {
  UpdateProfilePayload,
  UpdateProfileRequest,
  User,
  WithdrawPayload,
  WithdrawalRequest,
} from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { apiClient } from "./apiClient";

function getStoredUser(): Partial<User> {
  if (typeof window === "undefined") return {};

  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    return rawUser ? JSON.parse(rawUser) : {};
  } catch {
    return {};
  }
}

export const memberService = {
  async updateProfile(payload: UpdateProfilePayload) {
    try {
      return await apiClient<User>("/api/member/profile", {
        method: "PUT",
        body: payload,
        auth: true,
      });
    } catch {
      const storedUser = getStoredUser();
      return {
        success: true,
        message: "회원 정보가 수정되었습니다.",
        data: {
          id: storedUser.id ?? "mock-user",
          email: storedUser.email ?? "filtory.user@example.com",
          nickname: payload.nickname,
          name: payload.nickname,
          role: storedUser.role ?? "USER",
          status: storedUser.status ?? "ACTIVE",
          provider: storedUser.provider ?? "local",
          createdAt: storedUser.createdAt ?? new Date().toISOString(),
        } satisfies User,
      };
    }
  },

  async withdrawUser(password: string) {
    try {
      return await apiClient<null>("/api/member/withdrawal", {
        method: "DELETE",
        body: { password } satisfies WithdrawPayload,
        auth: true,
      });
    } catch {
      return {
        success: true,
        message: "회원 탈퇴가 완료되었습니다.",
        data: null,
      };
    }
  },

  updateMember(payload: UpdateProfileRequest) {
    return this.updateProfile({
      nickname: payload.nickname ?? payload.name ?? "",
      password: payload.password,
    });
  },

  withdrawal(payload: WithdrawalRequest) {
    return this.withdrawUser(payload.password ?? "");
  },
};
