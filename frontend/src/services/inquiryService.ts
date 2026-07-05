import { apiClient } from "./apiClient"

export type InquiryCategory =
  | "ANALYSIS_RESULT"
  | "REVIEW_INPUT"
  | "ACCOUNT"
  | "PAYMENT"
  | "SUGGESTION"
  | "OTHER"

export type InquiryStatus = "PENDING" | "IN_PROGRESS" | "ANSWERED"

export type InquiryRelatedAnalysis = {
  id: number
  hospitalName?: string | null
  category?: string | null
  createdAt?: string | null
  completedAt?: string | null
  totalScore?: number | null
  trustScore?: number | null
  adScore?: number | null
  foreignerScore?: number | null
}

export type InquiryAnswer = {
  id: number
  inquiryId: number
  adminId?: number | null
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type InquiryMember = {
  id: number
  email?: string | null
  nickname?: string | null
  name?: string | null
}

export type Inquiry = {
  id: number
  category: InquiryCategory
  subCategory?: string | null
  title: string
  content: string
  status: InquiryStatus
  relatedAnalysisId?: number | null
  attachmentUrl?: string | null
  attachment?: {
    fileName: string
    contentType?: string | null
    size?: number | null
    downloadUrl: string
  } | null
  createdAt?: string | null
  updatedAt?: string | null
  answer?: InquiryAnswer | null
  relatedAnalysis?: InquiryRelatedAnalysis | null
  member?: InquiryMember | null
}

export type CreateInquiryPayload = {
  category: InquiryCategory
  subCategory?: string
  title: string
  content: string
  relatedAnalysisId?: number | null
  attachmentFile?: File | null
}

export type InquiryFilters = {
  keyword?: string
  status?: "all" | InquiryStatus
  category?: "all" | InquiryCategory
  page?: number
  perPage?: number
}

export type PaginatedInquiries = {
  items: Inquiry[]
  total: number
  page: number
  perPage: number
}

function toQuery(filters: InquiryFilters = {}) {
  const params = new URLSearchParams()
  if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim())
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.category && filters.category !== "all") params.set("category", filters.category)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.perPage) params.set("per_page", String(filters.perPage))
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const inquiryService = {
  async createInquiry(payload: CreateInquiryPayload) {
    const body = payload.attachmentFile ? toInquiryFormData(payload) : {
      category: payload.category,
      subCategory: payload.subCategory,
      title: payload.title,
      content: payload.content,
      relatedAnalysisId: payload.relatedAnalysisId,
    }
    const result = await apiClient<Inquiry>("/api/inquiries", {
      method: "POST",
      auth: true,
      body,
    })
    return result.data
  },

  async getMyInquiries(filters: InquiryFilters = {}) {
    const result = await apiClient<Inquiry[]>(`/api/me/inquiries${toQuery(filters)}`, {
      auth: true,
    })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies PaginatedInquiries
  },

  async getMyInquiry(id: number) {
    const result = await apiClient<Inquiry>(`/api/inquiries/${id}`, {
      auth: true,
    })
    return result.data
  },

  async getAdminInquiries(filters: InquiryFilters = {}) {
    const result = await apiClient<Inquiry[]>(`/api/admin/inquiries${toQuery(filters)}`, {
      auth: true,
    })
    return {
      items: result.data,
      total: result.meta?.count ?? result.data.length,
      page: result.meta?.page ?? filters.page ?? 1,
      perPage: result.meta?.per_page ?? filters.perPage ?? 20,
    } satisfies PaginatedInquiries
  },

  async getAdminInquiry(id: number) {
    const result = await apiClient<Inquiry>(`/api/admin/inquiries/${id}`, {
      auth: true,
    })
    return result.data
  },

  async updateAdminStatus(id: number, status: InquiryStatus) {
    const result = await apiClient<Inquiry>(`/api/admin/inquiries/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: { status },
    })
    return result.data
  },

  async saveAdminAnswer(id: number, content: string) {
    const result = await apiClient<Inquiry>(`/api/admin/inquiries/${id}/answers`, {
      method: "POST",
      auth: true,
      body: { content },
    })
    return result.data
  },
}

function toInquiryFormData(payload: CreateInquiryPayload) {
  const formData = new FormData()
  formData.set("category", payload.category)
  if (payload.subCategory) formData.set("subCategory", payload.subCategory)
  formData.set("title", payload.title)
  formData.set("content", payload.content)
  if (payload.relatedAnalysisId) {
    formData.set("relatedAnalysisId", String(payload.relatedAnalysisId))
  }
  if (payload.attachmentFile) {
    formData.set("attachment", payload.attachmentFile)
  }
  return formData
}
