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

export type NotificationPage = {
  items: NotificationItem[]
  total: number
  page: number
  perPage: number
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
  async getNotifications(page = 1, perPage = 20): Promise<NotificationPage> {
    try {
      const result = await apiClient<BackendNotification[]>(`/api/notifications?page=${page}&per_page=${perPage}`, {
        auth: true,
      })
      return {
        items: (result.data ?? []).map(normalizeNotification),
        total: result.meta?.count ?? result.data?.length ?? 0,
        page: result.meta?.page ?? page,
        perPage: result.meta?.per_page ?? perPage,
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        return { items: [], total: 0, page: 1, perPage }
      }
      throw error
    }
  },

  async getUnreadCount() {
    try {
      const result = await apiClient<{ count: number }>("/api/notifications/unread-count", {
        auth: true,
      })
      return Math.max(0, Number(result.data?.count ?? 0))
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) return 0
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
