import type {
  UpdateProfilePayload,
  UpdateProfileRequest,
  User,
  WithdrawPayload,
  WithdrawalRequest,
} from "@/lib/types";
import { USE_MOCK } from "@/lib/constants";
import { ApiClientError, apiClient } from "./apiClient";
import { normalizeUser } from "./authTransforms";

type BackendUpdateProfilePayload = {
  email?: string
  real_name?: string
  nickname?: string
  phone?: string
  profile_img_url?: string | null
  date_of_birth?: string | null
  gender?: UpdateProfilePayload["gender"]
}

function getMemberPath(userId: User["id"]) {
  return `/api/members/${userId}`;
}

export const memberService = {
  previewProfileImage(file: File) {
    return URL.createObjectURL(file);
  },

  async uploadProfileImage(userId: User["id"], image: File) {
    const formData = new FormData()
    formData.append("image", image)
    const result = await apiClient<unknown>(`${getMemberPath(userId)}/profile-image`, {
      method: "POST",
      body: formData,
      auth: true,
    })
    return { ...result, data: normalizeUser(result.data as User) }
  },

  async removeProfileImage(userId: User["id"]) {
    const result = await apiClient<unknown>(`${getMemberPath(userId)}/profile-image`, {
      method: "DELETE",
      auth: true,
    })
    return { ...result, data: normalizeUser(result.data as User) }
  },

  async checkNicknameDuplicate(nickname: string) {
    const result = await apiClient<{ available: boolean }>(
      `/api/members/nickname-check?nickname=${encodeURIComponent(nickname)}`,
    )
    return result.data
  },

  async checkLoginIdDuplicate(loginId: string) {
    const result = await apiClient<{ available: boolean }>(
      `/api/members/login-id-check?login_id=${encodeURIComponent(loginId)}`,
    )
    return result.data
  },

  async updateProfile(userId: User["id"], payload: UpdateProfilePayload, currentUser?: User | null) {
    try {
      const result = await apiClient<unknown>(getMemberPath(userId), {
        method: "PATCH",
        body: toBackendUpdateProfilePayload(payload),
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
          nickname: payload.nickname ?? currentUser?.nickname ?? "",
          name: payload.name ?? currentUser?.name ?? payload.nickname ?? currentUser?.nickname ?? "",
          role: currentUser?.role ?? "USER",
          status: currentUser?.status ?? "ACTIVE",
          provider: currentUser?.provider ?? "local",
          profileImageUrl: payload.profileImageUrl === undefined ? currentUser?.profileImageUrl ?? null : payload.profileImageUrl,
          socialProviders: currentUser?.socialProviders ?? {
            google: false,
            naver: false,
            kakao: false,
          },
          emailVerified: currentUser?.emailVerified ?? false,
          hasPassword: currentUser?.hasPassword ?? true,
          joinedAt: currentUser?.joinedAt ?? currentUser?.createdAt,
          lastLoginAt: currentUser?.lastLoginAt,
          lastActiveAt: currentUser?.lastActiveAt,
          analysisCount: currentUser?.analysisCount,
          savedHospitalCount: currentUser?.savedHospitalCount,
          reportCount: currentUser?.reportCount,
          createdAt: currentUser?.createdAt ?? new Date().toISOString(),
          dateOfBirth: payload.dateOfBirth === undefined ? currentUser?.dateOfBirth ?? null : payload.dateOfBirth,
          gender: payload.gender === undefined ? currentUser?.gender ?? null : payload.gender,
        } satisfies User,
      };
    }
  },

  async changePassword(userId: User["id"], currentPassword: string, newPassword: string) {
    return apiClient<{ changed: boolean }>(`${getMemberPath(userId)}/password`, {
      method: "PATCH",
      auth: true,
      body: {
        currentPassword,
        newPassword,
      },
    });
  },

  async withdrawUser(userId: User["id"], password?: string, reason?: string) {
    const body: WithdrawPayload = {
      ...(password ? { password } : {}),
      ...(reason ? { reason } : {}),
    }

    try {
      return await apiClient<null>(getMemberPath(userId), {
        method: "DELETE",
        body,
        auth: true,
      });
    } catch (error) {
      if (!USE_MOCK) {
        if (error instanceof ApiClientError) {
          throw new Error(error.message)
        }
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
      name: payload.name,
      nickname: payload.nickname ?? payload.name ?? "",
      profileImageUrl: payload.profileImageUrl,
    }, currentUser);
  },

  withdrawal(userId: User["id"], payload: WithdrawalRequest) {
    return this.withdrawUser(userId, payload.password ?? "", payload.reason);
  },
};

function toBackendUpdateProfilePayload(payload: UpdateProfilePayload): BackendUpdateProfilePayload {
  const profileImgUrl =
    payload.profileImageUrl && payload.profileImageUrl.startsWith("blob:")
      ? undefined
      : payload.profileImageUrl

  return {
    email: payload.email,
    real_name: payload.name,
    nickname: payload.nickname,
    phone: payload.phone,
    profile_img_url: profileImgUrl,
    date_of_birth: payload.dateOfBirth,
    gender: payload.gender,
  }
}
