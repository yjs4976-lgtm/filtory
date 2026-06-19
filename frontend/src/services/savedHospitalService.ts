import type { SavedHospital } from "@/lib/types"

const STORAGE_KEY = "filtory-saved-hospitals"

function readStoredSavedHospitals(): SavedHospital[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is SavedHospital => Boolean(item?.id && item?.hospitalName && item?.category))
  } catch {
    return []
  }
}

function writeStoredSavedHospitals(items: SavedHospital[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const savedHospitalService = {
  async getSavedHospitals(): Promise<SavedHospital[]> {
    // TODO: 실제 저장 병원 API가 준비되면 /api/member/saved-hospitals로 교체합니다.
    return readStoredSavedHospitals()
  },

  async unsaveHospital(id: number) {
    // TODO: 실제 저장 해제 API 연결 시 DELETE /api/member/saved-hospitals/:id 호출로 교체합니다.
    const items = readStoredSavedHospitals()
    writeStoredSavedHospitals(items.filter((item) => item.id !== id))
    return { success: true, deletedId: id }
  },

  async addToCompare(id: number) {
    // TODO: 실제 비교함 API가 생기면 POST /api/member/compare 호출로 교체합니다.
    return { success: true, id }
  },
}
