import type { RecentViewedHospital } from "@/lib/types"
import { apiClient } from "./apiClient"

export type RecentHospitalPage = { items: RecentViewedHospital[]; total: number }

export const recentHospitalService = {
  async getRecentHospitalPage(page = 1, size = 20): Promise<RecentHospitalPage> {
    const result = await apiClient<RecentViewedHospital[]>(`/api/recent-hospitals?page=${page}&size=${size}`, { auth: true })
    return { items: result.data, total: result.meta?.total ?? result.data.length }
  },
  async getRecentViewedHospitals(): Promise<RecentViewedHospital[]> {
    return (await this.getRecentHospitalPage()).items
  },
  async recordRecentHospital(hospitalId: number, analysisResultId?: number) {
    await apiClient(`/api/recent-hospitals/${hospitalId}`, { method: "POST", body: { analysisResultId }, auth: true })
  },
  async deleteRecentHospital(id: number) {
    await apiClient(`/api/recent-hospitals/${id}`, { method: "DELETE", auth: true })
    return { success: true, deletedId: id }
  },
  async clearRecentHospitals() {
    await apiClient("/api/recent-hospitals", { method: "DELETE", auth: true })
    return { success: true }
  },
}
