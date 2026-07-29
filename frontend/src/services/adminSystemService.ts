import { apiClient } from "./apiClient"

export type AdminSystemStatus = {
  backendMain: "ok" | "error"
  database: "ok" | "error"
  backendAi: "checked" | "unknown" | "not_checked"
  serverTime: string
  totalAnalyses?: number | null
  pendingAnalyses?: number | null
  analyzingAnalyses?: number | null
  failedAnalyses?: number | null
  recentFailedAnalyses?: number | null
  auditLogsToday?: number | null
  openInquiries?: number | null
  readonly: boolean
}

export const adminSystemService = {
  async getStatus() {
    const result = await apiClient<AdminSystemStatus>("/api/admin/system-status", { auth: true })
    return result.data
  },
}
