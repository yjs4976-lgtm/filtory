import type { NotificationItem } from "@/lib/types"
import { apiClient, ApiClientError } from "./apiClient"

type BackendNotification = {
  id: number
  title?: string | null
  message?: string | null
  type?: NotificationItem["type"] | string | null
  isRead?: boolean | null
  createdAt?: string | null
  link?: string | null
  actionLabel?: string | null
}

function normalizeNotification(item: BackendNotification): NotificationItem {
  return {
    id: Number(item.id),
    title: String(item.title ?? ""),
    message: String(item.message ?? ""),
    type: normalizeType(item.type),
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt ? formatNotificationDate(item.createdAt) : "",
    link: item.link || undefined,
    actionLabel: item.actionLabel || undefined,
  }
}

function normalizeType(value: unknown): NotificationItem["type"] {
  const type = String(value ?? "")
  if (
    type === "analysis_done" ||
    type === "analysis_saved" ||
    type === "suspicious_review" ||
    type === "trust_score_changed" ||
    type === "review_requested" ||
    type === "review_in_progress" ||
    type === "review_resolved" ||
    type === "info_updated" ||
    type === "security" ||
    type === "system"
  ) {
    return type
  }
  return "system"
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const result = await apiClient<BackendNotification[]>("/api/notifications", {
        auth: true,
      })
      return (result.data ?? []).map(normalizeNotification)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) return []
      throw error
    }
  },

  async markAllAsRead() {
    await apiClient("/api/notifications/read-all", {
      method: "PATCH",
      auth: true,
    })
    return { success: true }
  },

  async markAsRead(id: number) {
    const result = await apiClient<BackendNotification>(`/api/notifications/${id}/read`, {
      method: "PATCH",
      auth: true,
    })
    return normalizeNotification(result.data)
  },
}
