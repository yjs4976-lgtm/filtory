export const emailVerificationService = {
  async resendVerificationEmail(email: string) {
    // TODO: 실제 인증 메일 재발송 API가 준비되면 POST /api/auth/email-verification/resend로 교체합니다.
    return { success: true, email }
  },

  async verifyEmail(token?: string | null) {
    // TODO: 실제 이메일 인증 API가 준비되면 POST /api/auth/email-verification/confirm로 교체합니다.
    return { success: true, verified: Boolean(token) }
  },
}
