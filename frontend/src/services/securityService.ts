import type { LoginHistory, SocialProvider } from "@/lib/types"
import { memberService } from "./memberService"

export const securityService = {
  async getLoginHistory(): Promise<LoginHistory[]> {
    // TODO: 실제 로그인 기록 API가 준비되면 /api/member/security/login-history로 교체합니다.
    return []
  },

  async changePassword(userId: string | number, currentPassword: string, newPassword: string) {
    return memberService.changePassword(userId, currentPassword, newPassword)
  },

  async toggleSocialProvider(provider: SocialProvider, connected: boolean) {
    // TODO: 실제 소셜 연결/해제 API 연결 시 /api/auth/social-link 호출로 교체합니다.
    return { success: true, provider, connected }
  },

  async logoutAllDevices() {
    // TODO: 실제 모든 기기 로그아웃 API가 준비되면 POST /api/auth/logout-all로 교체합니다.
    return { success: true }
  },
}
