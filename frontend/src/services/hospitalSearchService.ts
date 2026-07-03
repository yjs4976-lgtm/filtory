import type { HospitalCategory, HospitalItem, HospitalRegionCode } from "@/lib/types"
import { extractRegionLabelFromAddress, getEnglishRegionLabelFromKorean } from "@/lib/historyDisplay"
import { apiClient } from "./apiClient"

type BackendHospital = {
  id?: string | number
  provider?: string | null
  source_provider?: string | null
  external_place_id?: string | null
  hospital_name?: string | null
  category?: string | null
  region?: string | null
  address?: string | null
  road_address?: string | null
  phone?: string | null
  homepage_url?: string | null
  map_url?: string | null
  kakao_place_url?: string | null
  google_map_url?: string | null
  google_place_id?: string | null
  google_registered?: boolean | null
  naver_place_url?: string | null
  naver_place_id?: string | null
  source_url?: string | null
  source_name?: string | null
  description?: string | null
  treatment_items?: string | null
  english_name?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  is_official_hospital?: boolean | null
  official_source?: string | null
  naver_rating?: number | string | null
  naver_review_count?: number | null
  google_rating?: number | string | null
  google_review_count?: number | null
  has_english_info?: boolean | null
  has_english_reviews?: boolean | null
  has_google_photos?: boolean | null
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

const categoryLabels: Record<HospitalCategory, { ko: string; en: string }> = {
  derma: { ko: "피부과", en: "Skin Clinic" },
  eye: { ko: "안과", en: "Eye Clinic" },
  dental: { ko: "치과", en: "Dental Clinic" },
}

function normalizeCategory(category?: string | null): HospitalCategory {
  const value = String(category ?? "").toLowerCase()
  if (value === "ophthalmology" || value === "eye" || value === "안과") return "eye"
  if (value === "dentistry" || value === "dental" || value === "치과") return "dental"
  return "derma"
}

function isVerifiedNaverPlaceUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false

  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === "map.naver.com" || hostname.endsWith(".place.naver.com")
  } catch {
    return false
  }
}

function normalizeSourceUrl(item: BackendHospital, provider: string) {
  if (provider.toLowerCase() === "naver") {
    if (isVerifiedNaverPlaceUrl(item.source_url)) return item.source_url ?? undefined
    if (isVerifiedNaverPlaceUrl(item.naver_place_url)) return item.naver_place_url ?? undefined
    return undefined
  }

  return item.source_url ?? item.kakao_place_url ?? item.naver_place_url ?? undefined
}

function toOptionalCoordinate(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function toHospitalItem(item: BackendHospital): HospitalItem {
  const reviewCount = Number(item.google_review_count ?? item.naver_review_count ?? 0)
  const provider = item.provider ?? item.source_provider ?? undefined
  const safeLatitude = toOptionalCoordinate(item.latitude)
  const safeLongitude = toOptionalCoordinate(item.longitude)
  const naverRating = toOptionalCoordinate(item.naver_rating)
  const googleRating = toOptionalCoordinate(item.google_rating)
  const category = normalizeCategory(item.category)
  const address = item.address ?? ""
  const roadAddress = item.road_address ?? undefined
  const regionKoLabel = extractRegionLabelFromAddress(roadAddress || address)

  return {
    id: String(item.id ?? `hospital-${item.hospital_name ?? Date.now()}`),
    provider,
    externalPlaceId: item.external_place_id ?? undefined,
    name: String(item.hospital_name ?? "Hospital"),
    hospitalNameKo: item.hospital_name ?? undefined,
    hospitalNameEn: item.english_name ?? undefined,
    hospitalEnglishName: item.english_name ?? undefined,
    englishName: item.english_name ?? undefined,
    category,
    categoryKoLabel: categoryLabels[category].ko,
    categoryEnLabel: categoryLabels[category].en,
    region: (item.region || "seoul") as HospitalRegionCode,
    address,
    roadAddress,
    regionKoLabel,
    regionEnLabel: getEnglishRegionLabelFromKorean(regionKoLabel) || undefined,
    phone: item.phone ?? undefined,
    reviewCount,
    naverRating,
    naverReviewCount: item.naver_review_count ?? undefined,
    googleRating,
    googleReviewCount: item.google_review_count ?? undefined,
    sourceName: item.source_name ?? provider ?? undefined,
    sourceUrl: normalizeSourceUrl(item, provider ?? ""),
    mapUrl: item.map_url ?? item.kakao_place_url ?? item.naver_place_url ?? item.google_map_url ?? undefined,
    kakaoPlaceUrl: item.kakao_place_url ?? undefined,
    naverPlaceUrl: item.naver_place_url ?? undefined,
    naverPlaceId: item.naver_place_id ?? undefined,
    googleMapUrl: item.google_map_url ?? undefined,
    googlePlaceId: item.google_place_id ?? undefined,
    googleRegistered: item.google_registered ?? undefined,
    hasEnglishInfo: item.has_english_info ?? undefined,
    hasEnglishReviews: item.has_english_reviews ?? undefined,
    englishReviews: item.has_english_reviews ?? undefined,
    hasGooglePhotos: item.has_google_photos ?? undefined,
    latitude: safeLatitude,
    longitude: safeLongitude,
    lat: safeLatitude,
    lng: safeLongitude,
    homepageUrl: item.homepage_url ?? undefined,
    description: item.description ?? undefined,
    treatmentItems: item.treatment_items ?? undefined,
    isOfficialHospital: Boolean(item.is_official_hospital),
    officialSource: item.official_source ?? undefined,
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
    const result = await apiClient<BackendHospital[]>(`/api/hospitals/search${suffix}`)
    const records = Array.isArray(result.data) ? result.data : []

    return records.map(toHospitalItem)
  },
}
