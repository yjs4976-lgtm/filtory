import type { NotificationItem } from "@/lib/types"
import { mockNotifications } from "./memberMockData"

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    // TODO: 실제 알림 API가 준비되면 /api/member/notifications로 교체합니다.
    return mockNotifications
  },

  async markAllAsRead() {
    // TODO: 실제 전체 읽음 API 연결 시 PATCH /api/member/notifications/read-all 호출로 교체합니다.
    return { success: true }
  },
}
