import { apiClient } from "./apiClient"

export type AdminHospitalStatus = "active" | "needs_review" | "hidden" | "archived"
export type AdminHospitalCategory = "dermatology" | "ophthalmology" | "dentistry" | "orthopedics"

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
  page?: number
  perPage?: number
}

export type AdminPaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
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
    if (filters.page) params.set("page", String(filters.page))
    if (filters.perPage) params.set("per_page", String(filters.perPage))

    const query = params.toString()
    const result = await apiClient<AdminHospital[]>(`/api/admin/hospitals${query ? `?${query}` : ""}`, {
      auth: true,
    })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies AdminPaginatedResult<AdminHospital>
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
