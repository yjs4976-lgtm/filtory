import type { MyReport } from "@/lib/types"

const STORAGE_KEY = "filtory-my-reports"

function readStoredReports(): MyReport[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is MyReport => Boolean(item?.id && item?.hospitalName && item?.reason))
  } catch {
    return []
  }
}

function writeStoredReports(items: MyReport[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const reportService = {
  async getMyReports(): Promise<MyReport[]> {
    // TODO: 실제 검토 내역 API가 준비되면 /api/member/reports로 교체합니다.
    return readStoredReports()
  },

  async cancelReport(id: number) {
    // TODO: 실제 검토 취소 API 연결 시 PATCH /api/member/reports/:id/cancel로 교체합니다.
    const items = readStoredReports()
    writeStoredReports(items.filter((item) => item.id !== id))
    return { success: true, canceledId: id }
  },
}
