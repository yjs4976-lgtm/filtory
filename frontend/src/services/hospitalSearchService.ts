import type { HospitalCategory, HospitalItem, HospitalRegionCode } from "@/lib/types"
import { apiClient } from "./apiClient"

type BackendHospital = {
  id?: string | number
  hospital_name?: string | null
  category?: string | null
  region?: string | null
  address?: string | null
  phone?: string | null
  homepage_url?: string | null
  google_map_url?: string | null
  naver_place_url?: string | null
  description?: string | null
  treatment_items?: string | null
  english_name?: string | null
  naver_review_count?: number | null
  google_review_count?: number | null
}

type SearchParams = {
  keyword: string
  category?: HospitalCategory
  region?: HospitalRegionCode
  regionLabel?: string
}

const categoryToBackend: Record<HospitalCategory, string> = {
  derma: "derma",
  eye: "eye",
  dental: "dental",
}

function normalizeCategory(category?: string | null): HospitalCategory {
  const value = String(category ?? "").toLowerCase()
  if (value === "ophthalmology" || value === "eye" || value === "안과") return "eye"
  if (value === "dentistry" || value === "dental" || value === "치과") return "dental"
  return "derma"
}

function toHospitalItem(item: BackendHospital): HospitalItem {
  const reviewCount = Number(item.google_review_count ?? item.naver_review_count ?? 0)

  return {
    id: String(item.id ?? `hospital-${item.hospital_name ?? Date.now()}`),
    name: String(item.hospital_name ?? "Hospital"),
    hospitalNameKo: item.hospital_name ?? undefined,
    hospitalNameEn: item.english_name ?? undefined,
    hospitalEnglishName: item.english_name ?? undefined,
    category: normalizeCategory(item.category),
    region: (item.region || "seoul") as HospitalRegionCode,
    address: item.address ?? "",
    phone: item.phone ?? undefined,
    reviewCount,
    sourceUrl: item.naver_place_url ?? undefined,
    mapUrl: item.google_map_url ?? undefined,
    homepageUrl: item.homepage_url ?? undefined,
    description: item.description ?? undefined,
    treatmentItems: item.treatment_items ?? undefined,
  }
}

export const hospitalSearchService = {
  async searchHospitals({ keyword, category, region, regionLabel }: SearchParams): Promise<HospitalItem[]> {
    const params = new URLSearchParams()
    if (keyword.trim()) params.set("q", keyword.trim())
    if (category) params.set("category", categoryToBackend[category])
    if (regionLabel?.trim()) {
      params.set("region", regionLabel.trim())
    } else if (region) {
      params.set("region", region)
    }

    const suffix = params.toString() ? `?${params.toString()}` : ""
    const result = await apiClient<BackendHospital[]>(`/api/hospitals/${suffix}`)
    const records = Array.isArray(result.data) ? result.data : []

    return records.map(toHospitalItem)
  },
}
