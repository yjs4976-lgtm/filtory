import type { RecentViewedHospital } from "@/lib/types"

const STORAGE_KEY = "filtory-recent-viewed-hospitals"

function readStoredRecentHospitals(): RecentViewedHospital[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is RecentViewedHospital => Boolean(item?.id && item?.hospitalName && item?.category))
  } catch {
    return []
  }
}

function writeStoredRecentHospitals(items: RecentViewedHospital[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const recentHospitalService = {
  async getRecentViewedHospitals(): Promise<RecentViewedHospital[]> {
    // TODO: 실제 최근 본 병원 API가 준비되면 /api/member/recent-hospitals로 교체합니다.
    return readStoredRecentHospitals()
  },

  async deleteRecentHospital(id: number) {
    // TODO: 실제 최근 본 기록 삭제 API 연결 시 DELETE /api/member/recent-hospitals/:id 호출로 교체합니다.
    const items = readStoredRecentHospitals()
    writeStoredRecentHospitals(items.filter((item) => item.id !== id))
    return { success: true, deletedId: id }
  },

  async clearRecentHospitals() {
    // TODO: 실제 전체 삭제 API 연결 시 DELETE /api/member/recent-hospitals 호출로 교체합니다.
    writeStoredRecentHospitals([])
    return { success: true }
  },
}
