import { apiClient } from "./apiClient"
import { normalizeUser } from "./authTransforms"

export const emailVerificationService = {
  resendVerificationEmail() {
    return apiClient<{ requested: boolean; already_verified?: boolean; mail?: { sent: boolean; reason?: string } }>(
      "/api/auth/email-verification/resend",
      { method: "POST", auth: true },
    )
  },

  async verifyEmail(token?: string | null) {
    const result = await apiClient<unknown>("/api/auth/email-verification/confirm", {
      method: "POST",
      body: { token },
    })
    return { ...result, data: normalizeUser(result.data as never) }
  },
}
