import type { NotificationSettings } from "@/lib/types"
import { mockNotificationSettings } from "./memberMockData"

export type AppTheme = "system" | "light" | "dark"

export type AppSettingsPayload = NotificationSettings & {
  language: "ko" | "en"
  theme: AppTheme
}

export const settingService = {
  async getNotificationSettings(): Promise<NotificationSettings> {
    // TODO: 실제 설정 API가 준비되면 /api/member/settings로 교체합니다.
    return mockNotificationSettings
  },

  async saveSettings(payload: AppSettingsPayload) {
    // TODO: 실제 설정 저장 API 연결 시 PATCH /api/member/settings 호출로 교체합니다.
    return { success: true, data: payload }
  },
}
