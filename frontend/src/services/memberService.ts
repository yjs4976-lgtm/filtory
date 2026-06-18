import type {
  UpdateProfilePayload,
  UpdateProfileRequest,
  User,
  WithdrawPayload,
  WithdrawalRequest,
} from "@/lib/types";
import { USE_MOCK } from "@/lib/constants";
import { apiClient } from "./apiClient";
import { normalizeUser } from "./authTransforms";

function getMemberPath(userId: User["id"]) {
  return `/api/members/${userId}`;
}

export const memberService = {
  async updateProfile(userId: User["id"], payload: UpdateProfilePayload, currentUser?: User | null) {
    try {
      const result = await apiClient<unknown>(getMemberPath(userId), {
        method: "PATCH",
        body: payload,
        auth: true,
      });

      return {
        ...result,
        data: normalizeUser(result.data as User),
      };
    } catch {
      if (!USE_MOCK) {
        throw new Error("회원 정보 수정에 실패했습니다.");
      }

      return {
        success: true,
        message: "회원 정보가 수정되었습니다.",
        data: {
          id: currentUser?.id ?? userId,
          email: currentUser?.email ?? "filtory.user@example.com",
          nickname: payload.nickname,
          name: payload.nickname,
          role: currentUser?.role ?? "USER",
          status: currentUser?.status ?? "ACTIVE",
          provider: currentUser?.provider ?? "local",
          createdAt: currentUser?.createdAt ?? new Date().toISOString(),
        } satisfies User,
      };
    }
  },

  async withdrawUser(userId: User["id"], password: string) {
    try {
      return await apiClient<null>(getMemberPath(userId), {
        method: "DELETE",
        body: { password } satisfies WithdrawPayload,
        auth: true,
      });
    } catch {
      if (!USE_MOCK) {
        throw new Error("회원 탈퇴에 실패했습니다.");
      }

      return {
        success: true,
        message: "회원 탈퇴가 완료되었습니다.",
        data: null,
      };
    }
  },

  updateMember(userId: User["id"], payload: UpdateProfileRequest, currentUser?: User | null) {
    return this.updateProfile(userId, {
      nickname: payload.nickname ?? payload.name ?? "",
      password: payload.password,
    }, currentUser);
  },

  withdrawal(userId: User["id"], payload: WithdrawalRequest) {
    return this.withdrawUser(userId, payload.password ?? "");
  },
};
