import type { NotificationSettings } from "@/lib/types"

// 현재 화면에는 테마 선택기를 노출하지 않지만, 비활성 컴포넌트와의 타입 호환을 위해 남긴다.
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
