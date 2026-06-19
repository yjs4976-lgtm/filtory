import type { NotificationSettings } from "@/lib/types"

// Kept as a compatibility type for the dormant component; no theme selector is rendered.
export type AppTheme = "system" | "light" | "dark"
export type AppSettingsPayload = NotificationSettings & {
  language: "ko" | "en"
}

export const settingService = {
  async getNotificationSettings(): Promise<NotificationSettings> {
    // TODO: 실제 설정 API가 준비되면 /api/member/settings로 교체합니다.
    return {
      analysisCompleted: true,
      reportResult: true,
      savedHospitalUpdated: true,
      securityAlert: true,
      marketing: false,
    }
  },

  async saveSettings(payload: AppSettingsPayload) {
    // TODO: 실제 설정 저장 API 연결 시 PATCH /api/member/settings 호출로 교체합니다.
    return { success: true, data: payload }
  },
}
