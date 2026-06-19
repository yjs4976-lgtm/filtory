import type { NotificationItem } from "@/lib/types"
export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    // 실제 알림 API가 준비되기 전에는 임시 알림을 노출하지 않습니다.
    return []
  },

  async markAllAsRead() {
    // TODO: 실제 전체 읽음 API 연결 시 PATCH /api/member/notifications/read-all 호출로 교체합니다.
    return { success: true }
  },
}
