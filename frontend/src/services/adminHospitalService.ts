import { apiClient } from "./apiClient"

export type AdminHospitalStatus = "active" | "needs_review" | "hidden" | "archived"
export type AdminHospitalCategory = "dermatology" | "ophthalmology" | "dentistry"

export type AdminHospital = {
  id: number
  hospitalName: string
  category: AdminHospitalCategory
  region?: string | null
  address?: string | null
  roadAddress?: string | null
  phone?: string | null
  naverPlaceUrl?: string | null
  kakaoPlaceUrl?: string | null
  googleMapUrl?: string | null
  homepageUrl?: string | null
  englishName?: string | null
  hasEnglishInfo?: boolean
  hasEnglishReviews?: boolean
  hasPhotos?: boolean
  adminStatus: AdminHospitalStatus
  adminMemo?: string | null
  verifiedAt?: string | null
  hiddenAt?: string | null
  updatedAt?: string | null
}

export type AdminHospitalFilters = {
  keyword?: string
  category?: "all" | AdminHospitalCategory
  status?: "all" | AdminHospitalStatus
}

export type AdminHospitalUpdatePayload = Partial<
  Pick<
    AdminHospital,
    | "hospitalName"
    | "englishName"
    | "region"
    | "address"
    | "roadAddress"
    | "phone"
    | "naverPlaceUrl"
    | "kakaoPlaceUrl"
    | "googleMapUrl"
    | "homepageUrl"
    | "adminStatus"
    | "adminMemo"
    | "hasEnglishInfo"
    | "hasEnglishReviews"
    | "hasPhotos"
  >
> & {
  markVerified?: boolean
}

export const adminHospitalService = {
  async getHospitals(filters: AdminHospitalFilters = {}) {
    const params = new URLSearchParams()
    if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim())
    if (filters.category && filters.category !== "all") params.set("category", filters.category)
    if (filters.status && filters.status !== "all") params.set("status", filters.status)

    const query = params.toString()
    const result = await apiClient<AdminHospital[]>(`/api/admin/hospitals${query ? `?${query}` : ""}`, {
      auth: true,
    })
    return result.data
  },

  async updateHospital(id: number, payload: AdminHospitalUpdatePayload) {
    const result = await apiClient<AdminHospital>(`/api/admin/hospitals/${id}`, {
      method: "PATCH",
      auth: true,
      body: payload,
    })
    return result.data
  },
}
