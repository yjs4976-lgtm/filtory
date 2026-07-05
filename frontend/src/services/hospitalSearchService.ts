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

  return firstText(item.source_url, item.kakao_place_url, item.naver_place_url)
}

function toOptionalCoordinate(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function toPositiveNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined

  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined
}

function textOrUndefined(value: string | null | undefined): string | undefined {
  const text = String(value ?? "").trim()
  return text || undefined
}

function firstText(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const text = textOrUndefined(value)
    if (text) return text
  }
  return undefined
}

function providerReviewCount(
  provider: string | undefined,
  sourceName: string | undefined,
  naverReviewCount: number | undefined,
  googleReviewCount: number | undefined,
): number | undefined {
  const providerHint = `${provider ?? ""} ${sourceName ?? ""}`.toLowerCase()

  if (providerHint.includes("naver") || providerHint.includes("네이버")) {
    return naverReviewCount
  }

  if (providerHint.includes("google") || providerHint.includes("구글")) {
    return googleReviewCount
  }

  if (providerHint.includes("kakao") || providerHint.includes("카카오")) {
    return undefined
  }

  return naverReviewCount ?? googleReviewCount
}

function buildNaverMapSearchUrl(provider: string | undefined, sourceName: string | undefined, hospitalName: string, address?: string) {
  const providerHint = `${provider ?? ""} ${sourceName ?? ""}`.toLowerCase()
  if (!providerHint.includes("naver") && !providerHint.includes("네이버")) return undefined

  const query = [hospitalName, address]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")

  return query ? `https://map.naver.com/p/search/${encodeURIComponent(query)}` : undefined
}

function toHospitalItem(item: BackendHospital, requestedCategory?: HospitalCategory): HospitalItem {
  const provider = item.provider ?? item.source_provider ?? undefined
  const sourceName = item.source_name ?? provider ?? undefined
  const safeLatitude = toOptionalCoordinate(item.latitude)
  const safeLongitude = toOptionalCoordinate(item.longitude)
  const naverRating = toOptionalCoordinate(item.naver_rating)
  const googleRating = toOptionalCoordinate(item.google_rating)
  const naverReviewCount = toPositiveNumber(item.naver_review_count)
  const googleReviewCount = toPositiveNumber(item.google_review_count)
  const reviewCount = providerReviewCount(provider, sourceName, naverReviewCount, googleReviewCount)
  const rawCategory = textOrUndefined(item.category)
  const category = normalizeCategory(rawCategory ?? requestedCategory)
  const hasSpecificCategory = Boolean(rawCategory)
  const address = item.address ?? ""
  const roadAddress = item.road_address ?? undefined
  const hospitalName = String(item.hospital_name ?? "Hospital")
  const regionKoLabel = extractRegionLabelFromAddress(roadAddress || address)
  const naverMapFallbackUrl = buildNaverMapSearchUrl(provider, sourceName, hospitalName, roadAddress || address)
  const mapUrl = firstText(item.map_url, item.kakao_place_url, item.naver_place_url, item.google_map_url, naverMapFallbackUrl)

  return {
    id: String(item.id ?? `hospital-${item.hospital_name ?? Date.now()}`),
    provider,
    externalPlaceId: item.external_place_id ?? undefined,
    name: hospitalName,
    hospitalNameKo: item.hospital_name ?? undefined,
    hospitalNameEn: item.english_name ?? undefined,
    hospitalEnglishName: item.english_name ?? undefined,
    englishName: item.english_name ?? undefined,
    category,
    categoryKoLabel: hasSpecificCategory ? categoryLabels[category].ko : "병원",
    categoryEnLabel: hasSpecificCategory ? categoryLabels[category].en : "Clinic",
    region: (item.region || "seoul") as HospitalRegionCode,
    address,
    roadAddress,
    regionKoLabel,
    regionEnLabel: getEnglishRegionLabelFromKorean(regionKoLabel) || undefined,
    phone: item.phone ?? undefined,
    reviewCount,
    naverRating,
    naverReviewCount,
    googleRating,
    googleReviewCount,
    sourceName,
    sourceUrl: normalizeSourceUrl(item, provider ?? ""),
    mapUrl,
    kakaoPlaceUrl: textOrUndefined(item.kakao_place_url),
    naverPlaceUrl: textOrUndefined(item.naver_place_url),
    naverPlaceId: textOrUndefined(item.naver_place_id),
    googleMapUrl: textOrUndefined(item.google_map_url),
    googlePlaceId: textOrUndefined(item.google_place_id),
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

    return records.map((record) => toHospitalItem(record, category))
  },
}
