import type { SavedHospital, User } from "@/lib/types"
import { USE_MOCK } from "@/lib/constants"
import { apiClient } from "./apiClient"

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
  async getSavedHospitals(memberId?: User["id"]): Promise<SavedHospital[]> {
    const numericMemberId = Number(memberId)
    if (!Number.isInteger(numericMemberId) || numericMemberId <= 0) return readStoredSavedHospitals()

    try {
      const result = await apiClient<SavedHospital[]>(`/api/members/${numericMemberId}/saved-hospitals`, {
        auth: true,
      })
      return result.data
    } catch {
      if (USE_MOCK) return readStoredSavedHospitals()
      throw new Error("저장 병원 목록을 불러오지 못했습니다.")
    }
  },

  async saveHospital(memberId: User["id"], hospitalId: number, analysisResultId?: number) {
    const numericMemberId = Number(memberId)
    if (!Number.isInteger(numericMemberId) || numericMemberId <= 0) {
      throw new Error("로그인이 필요합니다.")
    }

    const result = await apiClient<SavedHospital>(`/api/members/${numericMemberId}/saved-hospitals`, {
      method: "POST",
      body: { hospital_id: hospitalId, analysis_result_id: analysisResultId },
      auth: true,
    })
    return result.data
  },

  async unsaveHospital(memberId: User["id"] | undefined, id: number) {
    const numericMemberId = Number(memberId)
    if (Number.isInteger(numericMemberId) && numericMemberId > 0) {
      await apiClient(`/api/members/${numericMemberId}/saved-hospitals/${id}`, {
        method: "DELETE",
        auth: true,
      })
    }
    const items = readStoredSavedHospitals()
    writeStoredSavedHospitals(items.filter((item) => item.id !== id))
    return { success: true, deletedId: id }
  },

}
