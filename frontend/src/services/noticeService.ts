import { apiClient } from "./apiClient"

export type NoticeSummary = {
  id: number
  title: string
  pinned: boolean
  publishedAt: string | null
}

export type NoticeDetail = NoticeSummary & { content: string }

export type AdminNotice = NoticeDetail & {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  createdAt: string | null
  updatedAt: string | null
  createdBy?: number | null
  updatedBy?: number | null
}

export type AdminFaq = {
  id: number
  category: string
  question: string
  answer?: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  sortOrder: number
}

export const noticeService = {
  async list(page = 1, perPage = 20) {
    const result = await apiClient<NoticeSummary[]>(`/api/notices?page=${page}&per_page=${perPage}`)
    return { items: result.data, total: result.meta?.count ?? result.data.length }
  },
  async featured() {
    const result = await apiClient<NoticeSummary | undefined>("/api/notices/featured")
    return result.data ?? null
  },
  async detail(id: number) {
    return (await apiClient<NoticeDetail>(`/api/notices/${id}`)).data
  },
}

export const adminContentService = {
  async listNotices(q = "", status = "all") {
    const params = new URLSearchParams({ per_page: "100" })
    if (q.trim()) params.set("q", q.trim())
    if (status !== "all") params.set("status", status)
    return (await apiClient<AdminNotice[]>(`/api/admin/notices?${params}`, { auth: true })).data
  },
  async getNotice(id: number) {
    return (await apiClient<AdminNotice>(`/api/admin/notices/${id}`, { auth: true })).data
  },
  async saveNotice(payload: Partial<AdminNotice> & { title: string; content: string }, id?: number) {
    return (await apiClient<AdminNotice>(id ? `/api/admin/notices/${id}` : "/api/admin/notices", {
      method: id ? "PATCH" : "POST", body: payload, auth: true,
    })).data
  },
  async archiveNotice(item: AdminNotice) {
    return (await apiClient<AdminNotice>(`/api/admin/notices/${item.id}`, {
      method: "PATCH", body: { status: "ARCHIVED" }, auth: true,
    })).data
  },
  async listFaqs() {
    return (await apiClient<AdminFaq[]>("/api/admin/faqs?per_page=100", { auth: true })).data
  },
  async getFaq(id: number) {
    return (await apiClient<AdminFaq>(`/api/admin/faqs/${id}`, { auth: true })).data
  },
  async saveFaq(payload: Partial<AdminFaq> & { question: string; answer: string }, id?: number) {
    return (await apiClient<AdminFaq>(id ? `/api/admin/faqs/${id}` : "/api/admin/faqs", {
      method: id ? "PATCH" : "POST", body: payload, auth: true,
    })).data
  },
}
