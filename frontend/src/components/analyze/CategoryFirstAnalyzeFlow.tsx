"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Bone,
  ExternalLink,
  Eye,
  FileCheck2,
  HelpCircle,
  LinkIcon,
  LoaderCircle,
  Maximize2,
  MapPinned,
  Pencil,
  Search,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { ToothIcon } from "@/components/common/ToothIcon"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import {
  getDemoReviewsForHospital,
  getHospitalDisplayName,
  getRegionLabel as getHospitalRegionLabel,
  searchDemoHospitals,
} from "@/lib/mockHospitals"
import {
  KOREA_REGION_OPTIONS,
  SELECTED_REGION_STORAGE_KEY,
  getRegionDistrict,
  getRegionLabel,
  matchesRegionText,
  type RegionDistrict,
  type RegionProvince,
  type RegionProvinceCode,
} from "@/lib/regions"
import { getTrustLevelKey, normalizeTrustLevelKey } from "@/lib/score"
import { writeCurrentReviewAnalysis } from "@/lib/analysisStorage"
import {
  extractRegionLabelFromAddress,
  getEnglishHospitalNameFromKorean,
  formatHistoryRegionLabel,
  getEnglishRegionLabelFromKorean,
} from "@/lib/historyDisplay"
import type {
  AnalysisHistoryItem,
  HospitalCategory,
  HospitalItem,
  HospitalRegionCode,
  HospitalReviewItem,
  ReviewAnalyzeRequest,
  ReviewAnalyzeResponse,
} from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import { translations } from "@/lib/translations"
import { isShortReviewText, splitReviewText, stripOwnerReplyText } from "@/lib/reviewTextParser"
import { analysisHistoryService } from "@/services/analysisHistoryService"
import { hospitalSearchService } from "@/services/hospitalSearchService"
import { reviewAnalysisService } from "@/services/reviewAnalysisService"
import { ApiClientError } from "@/services/apiClient"
import styles from "@/styles/App.module.css"
import { useMembership } from "@/context/MembershipContext"

type SelectedAnalyzeRegion = {
  provinceCode: RegionProvinceCode
  districtCode: string
}

type AnalysisRegionPayload = {
  region?: HospitalRegionCode
  regionId?: string
  regionLabel?: string
  regionKoLabel?: string
  regionEnLabel?: string
  regionProvinceCode?: string
  regionDistrictCode?: string
}

type DistrictSearchResult = {
  province: RegionProvince
  district: RegionDistrict
}

type AnalyzeCategoryFilter = HospitalCategory | null

type AccessibilityEnhancementInput = {
  googleMapUrl: string
  homepageUrl: string
  phone: string
  treatmentItems: string
  englishName: string
  hasEnglishInfo: boolean | null
  hasEnglishReviews: boolean | null
  hasGooglePhotos: boolean | null
  hasPhotos: boolean | null
}

type ReviewDraftSource = "manual" | "screenshot" | "file"
type ReviewDraftStatus = "ready" | "short" | "duplicate"

type ReviewDraft = {
  id: string
  content: string
  source: ReviewDraftSource
  included: boolean
  status: ReviewDraftStatus
}

type KakaoMapInstance = {
  setBounds: (bounds: unknown) => void
  relayout: () => void
  setCenter: (center: unknown) => void
  setLevel: (level: number) => void
}

type KakaoMapsWindow = Window & {
  kakao?: {
    maps?: {
      load: (callback: () => void) => void
      LatLng: new (lat: number, lng: number) => unknown
      LatLngBounds: new () => { extend: (position: unknown) => void }
      Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance
      Marker: new (options: { position: unknown; map: unknown }) => unknown
      event: { addListener: (target: unknown, eventName: string, handler: () => void) => void }
    }
  }
}

type ReviewExampleCategory = "kindness" | "waiting" | "cost" | "consultation" | "aftercare"

const categoryToHistoryName: Record<HospitalCategory, "skin" | "eye" | "dental" | "orthopedics"> = {
  derma: "skin",
  eye: "eye",
  dental: "dental",
  orthopedics: "orthopedics",
}

const categoryKeywordMatchers: Record<HospitalCategory, string[]> = {
  derma: ["피부", "피부과", "derma", "skin"],
  eye: ["안과", "라식", "라섹", "백내장", "드림렌즈", "eye", "ophthalmology"],
  dental: ["치과", "교정", "임플란트", "스케일링", "dental", "dentist"],
  orthopedics: ["정형외과", "정형", "관절", "척추", "orthopedics", "orthopedic"],
}

const REVIEW_EXAMPLE_CATEGORIES: ReviewExampleCategory[] = ["kindness", "waiting", "cost", "consultation", "aftercare"]
const PAGE_SIZE = 3
const MAX_REVIEW_IMPORT_FILE_SIZE = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const SUPPORTED_REVIEW_FILE_TYPES = new Set(["text/plain", "text/csv", "application/vnd.ms-excel"])
const REGION_SEARCH_RESULTS = KOREA_REGION_OPTIONS.flatMap((province) =>
  province.districts.map((district) => ({
    province,
    district,
  }))
)

function createEmptyAccessibilityEnhancement(): AccessibilityEnhancementInput {
  return {
    googleMapUrl: "",
    homepageUrl: "",
    phone: "",
    treatmentItems: "",
    englishName: "",
    hasEnglishInfo: null,
    hasEnglishReviews: null,
    hasGooglePhotos: null,
    hasPhotos: null,
  }
}

function detectCategoryFromKeyword(keyword: string): HospitalCategory | null {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return null

  return (Object.entries(categoryKeywordMatchers) as Array<[HospitalCategory, string[]]>).find(([, matchers]) =>
    matchers.some((matcher) => normalizedKeyword.includes(matcher.toLowerCase()))
  )?.[0] ?? null
}

function normalizeCategoryParam(value: string | null): HospitalCategory | null {
  const normalizedValue = value?.trim().toLowerCase()
  if (!normalizedValue) return null
  if (normalizedValue === "derma" || normalizedValue === "eye" || normalizedValue === "dental" || normalizedValue === "orthopedics") {
    return normalizedValue
  }

  return detectCategoryFromKeyword(normalizedValue)
}

function normalizeHospitalSearchText(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function normalizeRegionSearchText(value?: string) {
  return normalizeHospitalSearchText(value)
    .replaceAll("서울특별시", "서울")
    .replaceAll("서울시", "서울")
    .replaceAll("부산광역시", "부산")
    .replaceAll("부산시", "부산")
    .replaceAll("인천광역시", "인천")
    .replaceAll("인천시", "인천")
    .replaceAll("대구광역시", "대구")
    .replaceAll("대구시", "대구")
    .replaceAll("대전광역시", "대전")
    .replaceAll("대전시", "대전")
    .replaceAll("광주광역시", "광주")
    .replaceAll("광주시", "광주")
    .replaceAll("울산광역시", "울산")
    .replaceAll("울산시", "울산")
    .replaceAll("세종특별자치시", "세종")
    .replaceAll("경기도", "경기")
    .replaceAll("강원특별자치도", "강원")
    .replaceAll("강원도", "강원")
    .replaceAll("충청북도", "충북")
    .replaceAll("충청남도", "충남")
    .replaceAll("전북특별자치도", "전북")
    .replaceAll("전라북도", "전북")
    .replaceAll("전라남도", "전남")
    .replaceAll("경상북도", "경북")
    .replaceAll("경상남도", "경남")
    .replaceAll("제주특별자치도", "제주")
}

type HospitalWithCoordinate = HospitalItem & { latitude: number; longitude: number }

function getHospitalCoordinate(hospital: HospitalItem) {
  return {
    latitude: hospital.latitude ?? hospital.lat,
    longitude: hospital.longitude ?? hospital.lng,
  }
}

function hasValidKoreaCoordinate(hospital: HospitalItem): hospital is HospitalWithCoordinate {
  const { latitude, longitude } = getHospitalCoordinate(hospital)
  if (typeof latitude !== "number" || typeof longitude !== "number") return false
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false

  return latitude >= 32 && latitude <= 39.5 && longitude >= 123 && longitude <= 132
}

function hospitalMatchesRegion(hospital: HospitalItem, region: SelectedAnalyzeRegion | null, regionLabel: string) {
  if (!region) return true
  const normalizedRegionLabel = normalizeRegionSearchText(regionLabel)
  const normalizedAddress = normalizeRegionSearchText(hospital.address)
  const normalizedRoadAddress = normalizeRegionSearchText(hospital.roadAddress)
  const normalizedHospitalRegion = normalizeRegionSearchText(String(hospital.region ?? ""))
  const normalizedManualRegion = normalizeRegionSearchText(hospital.manualRegionLabel)
  const provinceCode = region.provinceCode.toLowerCase()

  return (
    hospital.region === provinceCode ||
    Boolean(normalizedRegionLabel && normalizedHospitalRegion.includes(normalizedRegionLabel)) ||
    Boolean(normalizedRegionLabel && normalizedAddress.includes(normalizedRegionLabel)) ||
    Boolean(normalizedRegionLabel && normalizedRoadAddress.includes(normalizedRegionLabel)) ||
    Boolean(normalizedRegionLabel && normalizedManualRegion.includes(normalizedRegionLabel))
  )
}

function hospitalMatchesKeyword(hospital: HospitalItem, keyword: string) {
  const normalizedKeyword = normalizeHospitalSearchText(keyword)
  if (normalizedKeyword.length <= 1) return true

  const searchable = [
    hospital.name,
    hospital.hospitalNameKo,
    hospital.hospitalNameEn,
    hospital.hospitalEnglishName,
    hospital.address,
    hospital.phone,
    hospital.treatmentItems,
    ...(hospital.searchKeywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")

  return normalizeHospitalSearchText(searchable).includes(normalizedKeyword)
}

type ApiAnalysisResult = AnalysisHistoryItem & {
  trustGrade?: string
  trustLevelKey?: ReviewAnalyzeResponse["trustLevelKey"]
  adSuspicion?: string
  detectedPatterns?: string[]
  repetitivePhrases?: string[]
  informationLevel?: string
  recommendation?: string
  modelVersion?: string
}

function trustLevelLabel(t: ReturnType<typeof useLanguage>["t"], level?: string, score?: number) {
  if (typeof score === "number") return t.trustLevels[getTrustLevelKey(score)]
  const trustLevelKey = normalizeTrustLevelKey(level)
  return trustLevelKey ? t.trustLevels[trustLevelKey] : t.trustLevels.safe
}

function levelLabel(t: ReturnType<typeof useLanguage>["t"], level?: string) {
  if (level === "high") return t.analyze.high
  if (level === "medium") return t.analyze.medium
  if (level === "low") return t.analyze.low
  return t.analyze.caution
}

function signalLevelFromValue(level?: string): "low" | "medium" | "high" {
  if (level === "high" || level === "높음") return "high"
  if (level === "low" || level === "낮음") return "low"
  return "medium"
}

function toFiveStarScore(score?: number, maxScore?: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0
  const resolvedMax = typeof maxScore === "number" && maxScore > 0
    ? maxScore
    : score > 5
      ? 100
      : 5
  return Math.max(0, Math.min(5, Math.round((score / resolvedMax) * 5)))
}

function concreteExperienceLevel(informationLevel: string): "low" | "medium" | "high" {
  if (informationLevel === "구체적") return "high"
  if (informationLevel === "보통") return "medium"
  return "low"
}

function splitTreatmentItems(value?: string) {
  return (value ?? "")
    .split(/[,/·]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function createReviewDraftId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID()
  return `review-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeReviewContent(content: string) {
  // 중복 검사는 공백/구두점 차이 때문에 놓치지 않도록 비교용 문자열을 단순화한다.
  return content
    .replace(/[.,!?~。！？]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function getReviewDraftStatus(content: string, duplicateCount: number): ReviewDraftStatus {
  if (duplicateCount > 1) return "duplicate"
  if (isShortReviewText(content)) return "short"
  return "ready"
}

function normalizeReviewDrafts(drafts: ReviewDraft[]) {
  // 붙여넣은 여러 리뷰를 분석 가능/짧음/중복 상태로 다시 계산한다.
  const counts = drafts.reduce<Record<string, number>>((acc, draft) => {
    const key = normalizeReviewContent(draft.content)
    if (key) acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return drafts.map((draft) => {
    const key = normalizeReviewContent(draft.content)
    return {
      ...draft,
      status: getReviewDraftStatus(draft.content, key ? counts[key] ?? 1 : 1),
    }
  })
}

function uniqueReviewTexts(values: string[]) {
  const seen = new Set<string>()
  const results: string[] = []

  values.forEach((value) => {
    const content = stripOwnerReplyText(value)
    const key = normalizeReviewContent(content)
    if (!content || !key || seen.has(key)) return
    seen.add(key)
    results.push(content)
  })

  return results
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === "\"" && nextCharacter === "\"") {
      current += "\""
      index += 1
      continue
    }

    if (character === "\"") {
      inQuotes = !inQuotes
      continue
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += character
  }

  cells.push(current.trim())
  return cells
}

function parseReviewFileText(text: string, fileName: string) {
  const isCsv = fileName.toLowerCase().endsWith(".csv")
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!isCsv) return lines

  const [headerLine, ...rowLines] = lines
  if (!headerLine) return []

  const headers = splitCsvLine(headerLine).map((header) => header.trim().toLowerCase())
  const reviewColumnIndex = headers.findIndex((header) => ["review", "content", "text", "리뷰", "내용"].includes(header))
  const dataRows = reviewColumnIndex >= 0 ? rowLines : lines

  return dataRows
    .map((line) => {
      const cells = splitCsvLine(line)
      if (reviewColumnIndex >= 0) return cells[reviewColumnIndex] ?? ""
      return cells.join(" ").trim()
    })
    .filter(Boolean)
}

function mergeReviewDraftsForAnalysis(drafts: ReviewDraft[]) {
  return drafts.map((draft, index) => `[리뷰 ${index + 1}]\n${draft.content.trim()}`).join("\n\n")
}

function isInternalHospitalId(id: string) {
  return /^\d+$/.test(id)
}

function buildNaverPlaceHref(hospital: HospitalItem, isNaverSource: boolean) {
  const placeId = hospital.naverPlaceId
  if (placeId && /^\d+$/.test(placeId)) {
    return `https://map.naver.com/p/entry/place/${placeId}?placePath=/review`
  }

  const directUrl = hospital.naverPlaceUrl || (isNaverSource ? hospital.sourceUrl : undefined)
  if (directUrl && isVerifiedNaverPlaceUrl(directUrl)) return withNaverReviewPath(directUrl)

  const regionLabel =
    hospital.regionKoLabel ||
    hospital.manualRegionLabel ||
    extractRegionLabelFromAddress(hospital.roadAddress || hospital.address)
  const query = [hospital.hospitalNameKo || hospital.name, regionLabel]
    .filter(Boolean)
    .join(" ")
    .trim()

  return query ? `https://map.naver.com/p/search/${encodeURIComponent(query)}` : undefined
}

function withNaverReviewPath(href: string) {
  try {
    const url = new URL(href)
    if (!url.hostname.includes("naver.")) return href
    if (!url.searchParams.has("placePath")) {
      url.searchParams.set("placePath", "/review")
    }
    return url.toString()
  } catch {
    return href
  }
}

function isVerifiedNaverPlaceUrl(href: string) {
  try {
    const hostname = new URL(href).hostname.toLowerCase()

    return hostname === "map.naver.com" || hostname.endsWith(".place.naver.com")
  } catch {
    return false
  }
}

function classifyMapUrl(href?: string) {
  if (!href) return {}

  try {
    const hostname = new URL(href).hostname.toLowerCase()

    if (hostname.includes("naver.com")) {
      return { naverPlaceUrl: href }
    }

    if (hostname.includes("kakao.com")) {
      return { kakaoPlaceUrl: href }
    }

    if (hostname.includes("google.")) {
      return { googleMapUrl: href }
    }
  } catch {
    return {}
  }

  return {}
}

function englishGuidanceStatusFromText(value?: string): boolean | undefined {
  const text = value?.trim().toLowerCase()
  if (!text) return undefined

  const negativePatterns = [
    /영어.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)/,
    /통역.{0,8}(없|불가|안\s*됨|지원하지|안\s*해|못\s*해)/,
    /외국인.{0,8}(불가|안\s*됨|진료\s*안|받지\s*않)/,
    /(no|not|without).{0,32}(english|interpreter|translation|foreigner)/,
    /(english|interpreter|translation|foreigner).{0,32}(not\s+available|unavailable|unsupported|not\s+supported|no\s+support)/,
  ]

  if (negativePatterns.some((pattern) => pattern.test(text))) {
    return false
  }

  return /english|영어 안내|외국어|통역|foreigner|international|multilingual|interpreter|translation|외국인 진료|외국어 안내/i.test(text)
    ? true
    : undefined
}

function isSameHref(left?: string, right?: string) {
  if (!left || !right) return false
  return left.replace(/\/$/, "") === right.replace(/\/$/, "")
}

function hasKoreanText(value?: string) {
  return /[가-힣]/.test(value ?? "")
}

function getLatinNamePrefix(value?: string) {
  const matches = value?.match(/[A-Za-z0-9]+(?:[&+.'-]?[A-Za-z0-9]+)*/g)
  return matches?.join(" ").trim() || ""
}

function getHospitalCardName(hospital: HospitalItem, language: "ko" | "en", categoryLabel: string) {
  if (language === "ko") return getHospitalDisplayName(hospital, language)

  const explicitEnglishName =
    hospital.hospitalEnglishName ||
    hospital.hospitalNameEn ||
    hospital.englishName

  if (explicitEnglishName && !hasKoreanText(explicitEnglishName)) {
    return explicitEnglishName
  }

  const latinPrefix = getLatinNamePrefix(hospital.name || hospital.hospitalNameKo)
  return (
    getEnglishHospitalNameFromKorean(hospital.name || hospital.hospitalNameKo, categoryLabel) ||
    (latinPrefix ? `${latinPrefix} ${categoryLabel}` : categoryLabel)
  )
}

function getHospitalCardRegionLabel(hospital: HospitalItem, fallbackRegionLabel: string, language: "ko" | "en") {
  if (language === "ko") {
    return hospital.regionKoLabel || extractRegionLabelFromAddress(hospital.roadAddress || hospital.address) || fallbackRegionLabel
  }

  return (
    hospital.regionEnLabel ||
    getEnglishRegionLabelFromKorean(hospital.regionKoLabel) ||
    getEnglishRegionLabelFromKorean(hospital.manualRegionLabel) ||
    getEnglishRegionLabelFromKorean(hospital.roadAddress || hospital.address) ||
    getEnglishRegionLabelFromKorean(hospital.region) ||
    getEnglishRegionLabelFromKorean(fallbackRegionLabel) ||
    formatHistoryRegionLabel(fallbackRegionLabel, "en")
  )
}

function getHospitalCardAddressLabel(hospital: HospitalItem) {
  const address = hospital.roadAddress || hospital.address
  return address || ""
}

function buildHospitalMetadataPayload(hospital?: HospitalItem) {
  if (!hospital) return {}

  // 선택한 병원의 장소 링크와 편의 정보는 리뷰 분석 payload에 같이 실어 결과 화면 보조 항목에 활용한다.
  const englishName = hospital.hospitalEnglishName || hospital.hospitalNameEn
  const mapUrlInfo = classifyMapUrl(hospital.mapUrl)
  const sourceUrlInfo = classifyMapUrl(hospital.sourceUrl)
  const googleMapUrl = hospital.googleMapUrl ?? mapUrlInfo.googleMapUrl ?? sourceUrlInfo.googleMapUrl
  const naverPlaceUrl =
    hospital.naverPlaceUrl && isVerifiedNaverPlaceUrl(hospital.naverPlaceUrl)
      ? hospital.naverPlaceUrl
      : mapUrlInfo.naverPlaceUrl ?? sourceUrlInfo.naverPlaceUrl
  const kakaoPlaceUrl = hospital.kakaoPlaceUrl ?? mapUrlInfo.kakaoPlaceUrl ?? sourceUrlInfo.kakaoPlaceUrl
  const hasEnglishInfo = hospital.hasEnglishInfo ?? englishGuidanceStatusFromText(hospital.description)
  const hasEnglishReviews = hospital.hasEnglishReviews ?? hospital.englishReviews
  const hasGooglePhotos = hospital.hasGooglePhotos ?? (hospital.imageUrl ? true : undefined)
  const hasPhotos = hospital.imageUrl ? true : undefined
  const googleRegistered = hospital.googleRegistered ?? (hospital.googlePlaceId || googleMapUrl ? true : undefined)

  return {
    address: hospital.address,
    roadAddress: hospital.roadAddress,
    phone: hospital.phone,
    treatmentItems: splitTreatmentItems(hospital.treatmentItems),
    description: hospital.description,
    hasPhotos,
    homepageUrl: hospital.homepageUrl,
    sourceProvider: hospital.provider,
    externalPlaceId: hospital.externalPlaceId,
    kakaoPlaceUrl,
    naverPlaceUrl,
    naverRating: hospital.naverRating,
    naverReviewCount: hospital.naverReviewCount,
    googleRating: hospital.googleRating,
    googleReviewCount: hospital.googleReviewCount,
    googleMapUrl,
    googlePlaceId: hospital.googlePlaceId,
    latitude: hospital.latitude ?? hospital.lat,
    longitude: hospital.longitude ?? hospital.lng,
    googleRegistered,
    englishName,
    hasEnglishInfo,
    hasEnglishReviews,
    englishReviews: hasEnglishReviews,
    hasGooglePhotos,
  }
}

function textOverride(value?: string | null, fallback?: string) {
  if (typeof value !== "string") return fallback
  return value.trim() || fallback
}

function booleanOverride(value: boolean | null, fallback?: boolean) {
  return value ?? fallback
}

function buildAccessibilityMetadataPayload(
  hospital: HospitalItem | undefined,
  input: AccessibilityEnhancementInput
): Pick<
  ReviewAnalyzeRequest,
  | "googleMapUrl"
  | "kakaoPlaceUrl"
  | "naverPlaceUrl"
  | "phone"
  | "treatmentItems"
  | "homepageUrl"
  | "englishName"
  | "hasEnglishInfo"
  | "hasEnglishReviews"
  | "englishReviews"
  | "hasGooglePhotos"
  | "hasPhotos"
> {
  const fallback = buildHospitalMetadataPayload(hospital)
  const hasEnglishReviews = booleanOverride(input.hasEnglishReviews, fallback.hasEnglishReviews)
  const inputMapUrl = input.googleMapUrl.trim()
  const inputMapUrlInfo = classifyMapUrl(inputMapUrl)

  return {
    googleMapUrl: textOverride(inputMapUrlInfo.googleMapUrl, fallback.googleMapUrl),
    kakaoPlaceUrl: textOverride(inputMapUrlInfo.kakaoPlaceUrl, fallback.kakaoPlaceUrl),
    naverPlaceUrl: textOverride(inputMapUrlInfo.naverPlaceUrl, fallback.naverPlaceUrl),
    phone: textOverride(input.phone, fallback.phone),
    treatmentItems: splitTreatmentItems(textOverride(input.treatmentItems, Array.isArray(fallback.treatmentItems) ? fallback.treatmentItems.join(", ") : "")),
    homepageUrl: textOverride(input.homepageUrl, fallback.homepageUrl),
    englishName: textOverride(input.englishName, fallback.englishName),
    hasEnglishInfo: booleanOverride(input.hasEnglishInfo, fallback.hasEnglishInfo),
    hasEnglishReviews,
    englishReviews: hasEnglishReviews,
    hasGooglePhotos: booleanOverride(input.hasGooglePhotos, fallback.hasGooglePhotos),
    hasPhotos: booleanOverride(input.hasPhotos, fallback.hasPhotos),
  }
}

function toHospitalRegionCode(region?: SelectedAnalyzeRegion | null): HospitalRegionCode | undefined {
  return region ? (region.provinceCode.toLowerCase() as HospitalRegionCode) : undefined
}

function buildAnalysisRegionPayload(region?: SelectedAnalyzeRegion | null): AnalysisRegionPayload {
  if (!region) return {}

  const regionKoLabel = getRegionLabel(region.provinceCode, region.districtCode, "ko")
  const regionEnLabel = formatHistoryRegionLabel(
    getRegionLabel(region.provinceCode, region.districtCode, "en"),
    "en"
  )

  return {
    region: toHospitalRegionCode(region),
    regionId: `${region.provinceCode}:${region.districtCode}`,
    regionLabel: regionKoLabel,
    regionKoLabel,
    regionEnLabel: getEnglishRegionLabelFromKorean(regionKoLabel) || regionEnLabel,
    regionProvinceCode: region.provinceCode,
    regionDistrictCode: region.districtCode,
  }
}

function createManualHospital({
  keyword,
  category,
  region,
  regionLabel,
}: {
  keyword: string
  category: HospitalCategory
  region?: HospitalRegionCode
  regionLabel: string
}): HospitalItem {
  const regionKoLabel = extractRegionLabelFromAddress(regionLabel)

  return {
    id: `manual-${Date.now()}`,
    name: keyword,
    hospitalNameKo: keyword,
    category,
    categoryKoLabel: translations.ko.categories[category],
    categoryEnLabel: translations.en.categories[category],
    region: region ?? "seoul",
    address: regionLabel,
    regionKoLabel,
    regionEnLabel: getEnglishRegionLabelFromKorean(regionKoLabel) || undefined,
    reviewCount: 0,
    isManual: true,
    manualRegionLabel: regionLabel,
    searchKeywords: [keyword, regionLabel].filter(Boolean),
  }
}

function readStoredAnalyzeRegion(): SelectedAnalyzeRegion | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(SELECTED_REGION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<SelectedAnalyzeRegion>
    if (!parsed.provinceCode || !parsed.districtCode) return null
    if (!getRegionDistrict(parsed.provinceCode, parsed.districtCode)) return null

    return {
      provinceCode: parsed.provinceCode,
      districtCode: parsed.districtCode,
    }
  } catch {
    window.localStorage.removeItem(SELECTED_REGION_STORAGE_KEY)
    return null
  }
}

function writeStoredAnalyzeRegion(region: SelectedAnalyzeRegion | null) {
  if (typeof window === "undefined") return

  if (!region) {
    window.localStorage.removeItem(SELECTED_REGION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SELECTED_REGION_STORAGE_KEY, JSON.stringify(region))
}

function findRegionByLabel(label: string): SelectedAnalyzeRegion | null {
  const normalizedLabel = label.trim().toLowerCase()
  if (!normalizedLabel) return null

  for (const province of KOREA_REGION_OPTIONS) {
    for (const district of province.districts) {
      const labels = [
        `${province.label.ko} ${district.label.ko}`,
        `${province.label.en} ${district.label.en}`,
      ].map((value) => value.toLowerCase())

      if (labels.includes(normalizedLabel)) {
        return {
          provinceCode: province.code,
          districtCode: district.code,
        }
      }
    }
  }

  return null
}

function readHydratedAnalyzeRegion(): SelectedAnalyzeRegion | null {
  if (typeof window === "undefined") return null

  const storedRegion = readStoredAnalyzeRegion()
  if (storedRegion) return storedRegion

  const queryRegion = new URLSearchParams(window.location.search).get("region")
  return queryRegion ? findRegionByLabel(queryRegion) : null
}

function createApiAnalysisResult({
  hospital,
  hospitalName,
  category,
  categoryKoLabel,
  categoryEnLabel,
  regionPayload,
  response,
  userId,
  selectedReviewCount,
  totalReviewCount,
  accessibilityInput,
}: {
  hospital?: HospitalItem
  hospitalName: string
  category: HospitalCategory
  categoryKoLabel: string
  categoryEnLabel: string
  regionPayload: AnalysisRegionPayload
  response: ReviewAnalyzeResponse
  userId?: string | number
  selectedReviewCount: number
  totalReviewCount: number
  accessibilityInput?: AccessibilityEnhancementInput
}): ApiAnalysisResult {
  const globalAccessibilityScore =
    response.globalAccessibilityScore ??
    response.foreignerScore ??
    (hospital ? [hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl, hospital.phone].filter(Boolean).length : 0)
  const foreignAccessibilityStars = toFiveStarScore(
    globalAccessibilityScore,
    response.globalAccessibilityMaxScore
  )
  const hospitalAddress = hospital?.roadAddress || hospital?.address
  const hospitalRegionKoLabel = hospital?.regionKoLabel ||
    extractRegionLabelFromAddress(hospital?.manualRegionLabel || hospitalAddress)
  const hospitalRegionEnLabel = hospital?.regionEnLabel || getEnglishRegionLabelFromKorean(hospitalRegionKoLabel)
  const hospitalEnglishName =
    accessibilityInput?.englishName.trim() ||
    hospital?.hospitalEnglishName ||
    hospital?.hospitalNameEn ||
    hospital?.englishName
  const mapUrlInfo = accessibilityInput?.googleMapUrl ? classifyMapUrl(accessibilityInput.googleMapUrl) : {}
  const manualMapUrl = accessibilityInput?.googleMapUrl.trim() || undefined
  const manualMapUrlSupported = Boolean(mapUrlInfo.googleMapUrl || mapUrlInfo.naverPlaceUrl || mapUrlInfo.kakaoPlaceUrl)
  const hospitalMapUrlInfo = hospital?.mapUrl ? classifyMapUrl(hospital.mapUrl) : {}
  const hospitalMapUrlSupported = Boolean(hospitalMapUrlInfo.googleMapUrl || hospitalMapUrlInfo.naverPlaceUrl || hospitalMapUrlInfo.kakaoPlaceUrl)
  const resultNaverPlaceUrl = mapUrlInfo.naverPlaceUrl || hospital?.naverPlaceUrl
  const resultKakaoPlaceUrl = mapUrlInfo.kakaoPlaceUrl || hospital?.kakaoPlaceUrl
  const resultGoogleMapUrl = mapUrlInfo.googleMapUrl || hospital?.googleMapUrl
  const resultHomepageUrl = accessibilityInput?.homepageUrl.trim() || hospital?.homepageUrl
  const resultPhone = accessibilityInput?.phone.trim() || hospital?.phone
  const resultTreatmentItems = accessibilityInput?.treatmentItems.trim() || hospital?.treatmentItems

  return {
    id: `analysis-${Date.now()}`,
    analysisRequestId: response.analysisRequestId,
    analysisResultId: response.analysisResultId,
    hospitalId: response.hospitalId,
    reviewIds: response.reviewIds,
    userId,
    hospitalName,
    hospitalNameKo: hospital?.hospitalNameKo,
    hospitalNameEn: hospitalEnglishName,
    hospitalEnglishName,
    englishName: hospitalEnglishName,
    category,
    categoryKoLabel,
    categoryEnLabel,
    hospitalCategory: categoryToHistoryName[category],
    hospitalAddress,
    roadAddress: hospital?.roadAddress,
    address: hospital?.address,
    region: regionPayload.region ?? hospital?.region,
    regionId: regionPayload.regionId,
    regionLabel: regionPayload.regionLabel || hospitalRegionKoLabel || hospital?.manualRegionLabel,
    regionKoLabel: regionPayload.regionKoLabel || hospitalRegionKoLabel,
    regionEnLabel: regionPayload.regionEnLabel || hospitalRegionEnLabel || undefined,
    regionProvinceCode: regionPayload.regionProvinceCode,
    regionDistrictCode: regionPayload.regionDistrictCode,
    sourceName: hospital?.sourceName,
    sourceProvider: hospital?.provider,
    provider: hospital?.provider,
    externalPlaceId: hospital?.externalPlaceId,
    sourceUrl: hospital?.sourceUrl,
    mapUrl: (manualMapUrlSupported ? manualMapUrl : undefined) || (hospitalMapUrlSupported ? hospital?.mapUrl : undefined),
    googleMapUrl: resultGoogleMapUrl,
    naverPlaceUrl: resultNaverPlaceUrl,
    kakaoPlaceUrl: resultKakaoPlaceUrl,
    homepageUrl: resultHomepageUrl,
    phone: resultPhone,
    treatmentItems: resultTreatmentItems,
    hasPhotos: accessibilityInput?.hasPhotos ?? (hospital?.imageUrl ? true : undefined),
    hasGooglePhotos: accessibilityInput?.hasGooglePhotos ?? hospital?.hasGooglePhotos,
    score: response.totalScore,
    foreignerFriendlyScore: globalAccessibilityScore,
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    selectedReviewCount,
    totalReviewCount,
    trustScore: response.trustScore,
    reviewTrustScore: response.reviewTrustScore,
    evidenceScore: response.evidenceScore,
    riskScore: response.riskScore,
    specificityScore: response.specificityScore,
    balanceScore: response.balanceScore,
    diversityScore: response.diversityScore,
    informativeScore: response.informativeScore,
    naturalnessScore: response.naturalnessScore,
    promoSignalScore: response.promoSignalScore,
    repetitionScore: response.repetitionScore,
    exaggerationScore: response.exaggerationScore,
    eventDiscountScore: response.eventDiscountScore,
    reviewBurstScore: response.reviewBurstScore,
    reviewBurstStatus: response.reviewBurstStatus,
    analysisConfidence: response.analysisConfidence,
    analysisConfidenceDescription: response.analysisConfidenceDescription,
    scoreBreakdown: response.scoreBreakdown,
    trustLevel: response.trustLevelKey,
    trustGrade: response.trustGrade,
    trustLevelKey: response.trustLevelKey,
    adSuspicion: response.adSuspicion,
    adSuspicionScore: response.adSuspicionScore,
    adSuspicionLevel: response.adSuspicionLevel,
    repetitivePatternLevel: response.repetitivePhrases.length > 0 ? signalLevelFromValue(response.adSuspicionLevel) : "low",
    concreteExperienceLevel: concreteExperienceLevel(response.reviewInformationLevel ?? response.informationLevel),
    summary: response.summary,
    suspiciousPhrases: response.suspiciousPhrases,
    repetitivePhrases: response.repetitivePhrases,
    detectedReasons: response.detectedPatterns,
    detectedPatterns: response.detectedPatterns,
    positiveSignals: response.positiveSignals,
    negativeSignals: response.negativeSignals,
    informationLevel: response.informationLevel,
    informationScore: response.informationScore,
    recommendation: response.recommendation,
    visitTip: response.visitTip,
    modelVersion: response.modelVersion,
    infoCompletenessScore: response.informationScore,
    globalAccessibilityScore,
    globalAccessibilityLevel: response.globalAccessibilityLevel,
    globalAccessRating: foreignAccessibilityStars,
    foreignAccessibilityStars,
    reviewCount: selectedReviewCount,
    resultStatus: "completed",
  }
}

export function CategoryFirstAnalyzeFlow({ userId }: { userId?: string | number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { showToast } = useToast()
  const { chargeCompletedAnalysis } = useMembership()
  const currentLanguage = language === "en" ? "en" : "ko"
  const [category, setCategory] = useState<AnalyzeCategoryFilter>(() => normalizeCategoryParam(searchParams.get("category")))
  const [selectedRegion, setSelectedRegion] = useState<SelectedAnalyzeRegion | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")
  const [modalProvinceCode, setModalProvinceCode] = useState<RegionProvinceCode | "">("")
  const [query, setQuery] = useState(() => searchParams.get("hospital")?.trim() ?? "")
  const [isHospitalQueryComposing, setIsHospitalQueryComposing] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<HospitalItem[]>([])
  const [isHospitalSearching, setIsHospitalSearching] = useState(false)
  const [hospitalSearchError, setHospitalSearchError] = useState("")
  const [searchFiltersRelaxed, setSearchFiltersRelaxed] = useState(false)
  const [hospitalPage, setHospitalPage] = useState(0)
  const [selectedHospital, setSelectedHospital] = useState<HospitalItem | null>(null)
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [reviewPage, setReviewPage] = useState(0)
  const [directHospitalName, setDirectHospitalName] = useState("")
  const [directReviewText, setDirectReviewText] = useState("")
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([])
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [screenshotFileNames, setScreenshotFileNames] = useState<string[]>([])
  const [uploadedReviewFileName, setUploadedReviewFileName] = useState("")
  const [isExtractingScreenshotText, setIsExtractingScreenshotText] = useState(false)
  const [accessibilityInput, setAccessibilityInput] = useState<AccessibilityEnhancementInput>(() =>
    createEmptyAccessibilityEnhancement()
  )
  const [analysisResult, setAnalysisResult] = useState<ApiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState("")
  const [inputError, setInputError] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const regionSearchRef = useRef<HTMLInputElement>(null)
  const reviewImportSectionRef = useRef<HTMLElement | null>(null)
  const initialSearchAppliedRef = useRef(false)

  const reviews = useMemo(() => (selectedHospital ? getDemoReviewsForHospital(selectedHospital) : []), [selectedHospital])
  const selectedReviews = reviews.filter((review) => selectedReviewIds.includes(review.id))
  const hospitals = results
  const reviewTotalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const visibleReviews = reviews.slice(reviewPage * PAGE_SIZE, reviewPage * PAGE_SIZE + PAGE_SIZE)
  const reviewInboxSummary = useMemo(() => {
    const shortCount = reviewDrafts.filter((review) => review.status === "short").length
    const duplicateCount = reviewDrafts.filter((review) => review.status === "duplicate").length
    const readyCount = reviewDrafts.filter((review) => review.included && review.status !== "duplicate").length

    return {
      totalCount: reviewDrafts.length,
      shortCount,
      duplicateCount,
      readyCount,
    }
  }, [reviewDrafts])
  const analysisReadyReviewDrafts = useMemo(
    () => reviewDrafts.filter((review) => review.included && review.status !== "duplicate" && review.content.trim()),
    [reviewDrafts]
  )
  const includedReviewDraftTexts = useMemo(
    () => uniqueReviewTexts(reviewDrafts.filter((review) => review.included).map((review) => review.content)),
    [reviewDrafts]
  )
  const pendingReviewTexts = useMemo(() => uniqueReviewTexts(splitReviewText(directReviewText)), [directReviewText])
  const pendingReadyReviewTexts = useMemo(() => {
    const pendingDrafts = splitReviewText(directReviewText).map((content, index) => ({
      id: `pending-${index}`,
      content,
      source: "manual" as ReviewDraftSource,
      included: true,
      status: "ready" as ReviewDraftStatus,
    }))

    return normalizeReviewDrafts(pendingDrafts)
      .filter((review) => review.included && review.status !== "duplicate")
      .map((review) => review.content.trim())
      .filter(Boolean)
  }, [directReviewText])
  const isReviewAnalysisDisabled = isAnalyzing
  const selectedRegionLabel = selectedRegion
    ? getRegionLabel(selectedRegion.provinceCode, selectedRegion.districtCode, currentLanguage)
    : ""
  const selectedRegionSearchLabel = selectedRegion
    ? getRegionLabel(selectedRegion.provinceCode, selectedRegion.districtCode, "ko")
    : ""
  const trimmedRegionSearch = regionSearch.trim()
  const selectedModalProvince = KOREA_REGION_OPTIONS.find((province) => province.code === modalProvinceCode)
  const districtOptions = selectedModalProvince?.districts ?? []
  const filteredProvinces = trimmedRegionSearch
    ? KOREA_REGION_OPTIONS.filter((province) => matchesRegionText(province, trimmedRegionSearch))
    : KOREA_REGION_OPTIONS
  const filteredDistricts: DistrictSearchResult[] = trimmedRegionSearch
    ? REGION_SEARCH_RESULTS.filter(({ province, district }) =>
        matchesRegionText(province, trimmedRegionSearch) || matchesRegionText(district, trimmedRegionSearch)
      )
    : selectedModalProvince?.districts.map((district) => ({
        province: selectedModalProvince,
        district,
      })) ?? []
  const hasRegionSearchResults = filteredProvinces.length > 0 || filteredDistricts.length > 0
  const directHospitalKeyword = query.trim()
  const detectedCategory = detectCategoryFromKeyword(directHospitalKeyword)
  const effectiveSearchCategory = category ?? detectedCategory
  const hasSelectedSearchCondition = Boolean(isHydrated && selectedRegion) || Boolean(category)
  const hasShortHospitalKeyword = !isHospitalQueryComposing && directHospitalKeyword.length === 1
  const hospitalKeywordForFiltering = isHospitalQueryComposing ? "" : directHospitalKeyword
  const filteredHospitals = useMemo(
    () =>
      hospitals.filter(
        (hospital) =>
          (!category || hospital.category === category) &&
          hospitalMatchesRegion(hospital, selectedRegion, selectedRegionSearchLabel) &&
          hospitalMatchesKeyword(hospital, hospitalKeywordForFiltering)
      ),
    [category, hospitalKeywordForFiltering, hospitals, selectedRegion, selectedRegionSearchLabel]
  )
  const hospitalTotalPages = Math.max(1, Math.ceil(filteredHospitals.length / PAGE_SIZE))
  const visibleHospitals = filteredHospitals.slice(hospitalPage * PAGE_SIZE, hospitalPage * PAGE_SIZE + PAGE_SIZE)
  const searchResultContextLabel = [
    selectedRegionLabel,
    category ? t.categories[category] : "",
  ].filter(Boolean).join(" · ")
  const searchResultMessage = searchResultContextLabel
    ? t.analyze.hospitalResultMessageWithCondition.replace("{condition}", searchResultContextLabel)
    : t.analyze.hospitalResultMessageDefault
  const hospitalSearchPlaceholder = selectedRegionLabel && !category
    ? t.analyze.hospitalFinderPlaceholderInRegion.replace("{region}", selectedRegionLabel)
    : hasSelectedSearchCondition
      ? t.analyze.hospitalFinderPlaceholderWithCondition
      : t.analyze.hospitalFinderPlaceholder
  const categorySheetItems = [
    { key: "derma" as const, label: t.categories.derma, desc: t.categories.dermaDesc, icon: Sparkles },
    { key: "eye" as const, label: t.categories.eye, desc: t.categories.eyeDesc, icon: Eye },
    { key: "dental" as const, label: t.categories.dental, desc: t.categories.dentalDesc, icon: ToothIcon },
    { key: "orthopedics" as const, label: t.categories.orthopedics, desc: t.categories.orthopedicsDesc, icon: Bone },
  ]

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedRegion(readHydratedAnalyzeRegion())
      setIsHydrated(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isRegionModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    regionSearchRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRegionModalOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isRegionModalOpen])

  useEffect(() => {
    if (!isCategorySheetOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCategorySheetOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isCategorySheetOpen])

  const addReviewDrafts = (contents: string[], source: ReviewDraftSource) => {
    const nextDrafts = contents
      .map((content) => content.trim())
      .filter(Boolean)
      .map((content) => ({
        id: createReviewDraftId(),
        content,
        source,
        included: true,
        status: "ready" as ReviewDraftStatus,
      }))

    if (nextDrafts.length === 0) return 0

    setReviewDrafts((current) => normalizeReviewDrafts([...current, ...nextDrafts]))
    setInputError("")
    return nextDrafts.length
  }

  const handleAddManualReviews = () => {
    const addedCount = addReviewDrafts(splitReviewText(directReviewText), "manual")
    if (addedCount === 0) {
      setReviewFeedback(t.analyze.reviewInbox.emptyInputFeedback)
      return
    }

    setDirectReviewText("")
    setReviewFeedback(t.analyze.reviewInbox.addedFeedback.replace("{count}", String(addedCount)))
  }

  const handleScreenshotFiles = (files: File[]) => {
    const supportedFiles = files.filter(
      (file) => SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_REVIEW_IMPORT_FILE_SIZE
    )
    setScreenshotFiles(supportedFiles)
    setScreenshotFileNames(supportedFiles.map((file) => file.name))

    if (files.length > supportedFiles.length) {
      setReviewFeedback(t.analyze.reviewInbox.importUnsupportedFeedback)
      return
    }

    if (supportedFiles.length > 0) {
      setReviewFeedback(t.analyze.reviewInbox.screenshotSelectedFeedback.replace("{count}", String(supportedFiles.length)))
    }
  }

  const handleReadScreenshotReviews = async () => {
    if (screenshotFiles.length === 0) {
      setReviewFeedback(t.analyze.reviewInbox.screenshotRequiredFeedback)
      return
    }

    setIsExtractingScreenshotText(true)
    setReviewFeedback(t.analyze.reviewInbox.ocrExtractingFeedback)

    try {
      const result = await reviewAnalysisService.extractReviewTextFromImages(screenshotFiles, currentLanguage)
      const extractedReviews = result.reviews.length > 0 ? result.reviews : splitReviewText(result.text)
      const addedCount = addReviewDrafts(extractedReviews, "screenshot")

      if (addedCount === 0) {
        setReviewFeedback(t.analyze.reviewInbox.ocrEmptyFeedback)
        return
      }

      setScreenshotFiles([])
      setScreenshotFileNames([])
      setReviewFeedback(t.analyze.reviewInbox.ocrAddedFeedback.replace("{count}", String(addedCount)))
    } catch (error) {
      setReviewFeedback(
        error instanceof ApiClientError
          ? error.message
          : t.analyze.reviewInbox.ocrErrorFeedback
      )
    } finally {
      setIsExtractingScreenshotText(false)
    }
  }

  const handleReviewTextFile = async (file?: File) => {
    if (!file) return

    setUploadedReviewFileName(file.name)

    const fileName = file.name.toLowerCase()
    const isSupportedExtension = fileName.endsWith(".txt") || fileName.endsWith(".csv")
    const isSupportedType = !file.type || SUPPORTED_REVIEW_FILE_TYPES.has(file.type)
    if (!isSupportedExtension || !isSupportedType || file.size > MAX_REVIEW_IMPORT_FILE_SIZE) {
      setReviewFeedback(t.analyze.reviewInbox.importUnsupportedFeedback)
      return
    }

    try {
      const text = await file.text()
      const addedCount = addReviewDrafts(parseReviewFileText(text, file.name), "file")
      setReviewFeedback(
        addedCount > 0
          ? t.analyze.reviewInbox.fileAddedFeedback.replace("{count}", String(addedCount))
          : t.analyze.reviewInbox.fileEmptyFeedback
      )
    } catch {
      setReviewFeedback(t.analyze.reviewInbox.fileReadErrorFeedback)
    }
  }

  const handleCombinedReviewImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    if (files.every((file) => SUPPORTED_IMAGE_TYPES.has(file.type))) {
      handleScreenshotFiles(files)
      return
    }

    if (files.length === 1) {
      await handleReviewTextFile(files[0])
      return
    }

    setReviewFeedback(t.analyze.reviewInbox.importUnsupportedFeedback)
  }

  const handleReviewDraftContentChange = (reviewId: string, content: string) => {
    setReviewDrafts((current) =>
      normalizeReviewDrafts(current.map((review) => (review.id === reviewId ? { ...review, content } : review)))
    )
  }

  const handleToggleReviewDraft = (reviewId: string) => {
    setReviewDrafts((current) =>
      current.map((review) => (review.id === reviewId ? { ...review, included: !review.included } : review))
    )
  }

  const handleDeleteReviewDraft = (reviewId: string) => {
    setReviewDrafts((current) => normalizeReviewDrafts(current.filter((review) => review.id !== reviewId)))
  }

  const handleClearReviewDrafts = () => {
    setReviewDrafts([])
    setReviewFeedback("")
  }

  const handleAccessibilityTextChange = (
    field: "googleMapUrl" | "homepageUrl" | "phone" | "treatmentItems" | "englishName",
    value: string
  ) => {
    setAccessibilityInput((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleAccessibilityBooleanChange = (
    field: "hasEnglishInfo" | "hasEnglishReviews" | "hasGooglePhotos" | "hasPhotos",
    value: boolean | null
  ) => {
    setAccessibilityInput((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSearch = useCallback(async (options: {
    withoutFilters?: boolean
    regionOverride?: SelectedAnalyzeRegion | null
    categoryOverride?: AnalyzeCategoryFilter
    keywordOverride?: string
  } = {}) => {
    const searchKeyword = options.keywordOverride ?? directHospitalKeyword
    const keyword = searchKeyword.trim().length <= 1 ? "" : searchKeyword.trim()
    const selectedRegionForSearch = options.regionOverride === undefined ? selectedRegion : options.regionOverride
    const selectedCategoryForSearch =
      options.categoryOverride === undefined ? effectiveSearchCategory : options.categoryOverride
    const regionLabelForSearch = selectedRegionForSearch
      ? getRegionLabel(selectedRegionForSearch.provinceCode, selectedRegionForSearch.districtCode, "ko")
      : ""
    const nextRegion = options.withoutFilters ? undefined : toHospitalRegionCode(selectedRegionForSearch)
    const nextCategory = options.withoutFilters ? undefined : selectedCategoryForSearch ?? undefined
    const nextRegionLabel = options.withoutFilters ? "" : regionLabelForSearch

    if (options.withoutFilters) {
      setSelectedRegion(null)
      writeStoredAnalyzeRegion(null)
      setSearchFiltersRelaxed(true)
    } else {
      setSearchFiltersRelaxed(false)
    }

    setHasSearched(true)
    setIsHospitalSearching(true)
    setHospitalSearchError("")
    setHospitalPage(0)
    setSelectedHospital(null)
    setSelectedReviewIds([])
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)

    try {
      const apiResults = await hospitalSearchService.searchHospitals({
        keyword,
        category: nextCategory,
        region: nextRegion,
        regionLabel: nextRegionLabel,
      })
      const fallbackResults = apiResults.length > 0
        ? []
        : searchDemoHospitals({
            category: nextCategory,
            region: nextRegion,
            query: keyword || nextRegionLabel,
          })
      setResults([...apiResults, ...fallbackResults])
    } catch {
      setHospitalSearchError(t.analyze.hospitalSearchFailed)
      setResults(searchDemoHospitals({
        category: nextCategory,
        region: nextRegion,
        query: keyword || nextRegionLabel,
      }))
    } finally {
      setIsHospitalSearching(false)
    }
  }, [directHospitalKeyword, effectiveSearchCategory, selectedRegion, t.analyze.hospitalSearchFailed])

  useEffect(() => {
    if (!isHydrated || initialSearchAppliedRef.current || typeof window === "undefined") return

    initialSearchAppliedRef.current = true

    const hasInitialSearchParams = searchParams.has("hospital") || searchParams.has("category") || searchParams.has("region")
    if (!hasInitialSearchParams) return

    const initialHospitalKeyword = searchParams.get("hospital")?.trim() ?? ""
    const initialCategory = normalizeCategoryParam(searchParams.get("category"))

    if (!initialHospitalKeyword) {
      if (initialCategory || selectedRegion) {
        const timer = window.setTimeout(() => {
          void handleSearch({
            categoryOverride: initialCategory ?? category,
            regionOverride: selectedRegion,
          })
        }, 0)
        return () => window.clearTimeout(timer)
      }
      return
    }

    const timer = window.setTimeout(() => {
      void handleSearch({
        keywordOverride: initialHospitalKeyword,
        categoryOverride: initialCategory ?? detectCategoryFromKeyword(initialHospitalKeyword) ?? category,
        regionOverride: selectedRegion,
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [category, handleSearch, isHydrated, searchParams, selectedRegion])

  const resetSearchState = () => {
    setHasSearched(false)
    setResults([])
    setIsHospitalSearching(false)
    setHospitalSearchError("")
    setSearchFiltersRelaxed(false)
    setHospitalPage(0)
    setSelectedHospital(null)
    setSelectedReviewIds([])
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
  }

  const handleCategoryChange = (nextCategory: HospitalCategory) => {
    setCategory(nextCategory)
    setIsCategorySheetOpen(false)
    void handleSearch({ categoryOverride: nextCategory })
  }

  const clearSelectedCategory = () => {
    setCategory(null)
    if (selectedRegion || directHospitalKeyword.trim().length >= 2) {
      void handleSearch({ categoryOverride: null })
    } else {
      resetSearchState()
    }
  }

  const handleHospitalQueryChange = (value: string) => {
    setQuery(value)
    setHospitalPage(0)
    const nextCategory = detectCategoryFromKeyword(value)
    if (nextCategory) setCategory(nextCategory)
  }

  const openRegionModal = () => {
    setRegionSearch("")
    setModalProvinceCode(selectedRegion?.provinceCode ?? "")
    setIsRegionModalOpen(true)
  }

  const selectProvince = (province: RegionProvince) => {
    setModalProvinceCode(province.code)
    setRegionSearch("")
  }

  const resetProvinceSelection = () => {
    setModalProvinceCode("")
    setRegionSearch("")
  }

  const selectDistrict = (province: RegionProvince, district: RegionDistrict) => {
    const nextRegion = {
      provinceCode: province.code,
      districtCode: district.code,
    }
    setSelectedRegion(nextRegion)
    writeStoredAnalyzeRegion(nextRegion)
    setIsRegionModalOpen(false)
    setRegionSearch("")
    setModalProvinceCode(province.code)
    void handleSearch({ regionOverride: nextRegion })
  }

  const clearSelectedRegion = () => {
    setSelectedRegion(null)
    writeStoredAnalyzeRegion(null)
    if (category || directHospitalKeyword.trim().length >= 2) {
      void handleSearch({ regionOverride: null })
    } else {
      resetSearchState()
    }
  }

  const handleResetHospitalSearch = () => {
    setQuery("")
    setCategory(null)
    setSelectedRegion(null)
    writeStoredAnalyzeRegion(null)
    resetSearchState()
  }

  const scrollToReviewImport = useCallback(() => {
    window.requestAnimationFrame(() => {
      reviewImportSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }, [])

  const handleOpenReviews = useCallback((hospital: HospitalItem) => {
    const nextReviews = getDemoReviewsForHospital(hospital)
    setSelectedHospital(hospital)
    setDirectHospitalName(hospital.name)
    setSelectedReviewIds(nextReviews.map((review) => review.id))
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
    scrollToReviewImport()
  }, [scrollToReviewImport])

  const handleSelectManualHospital = () => {
    if (directHospitalKeyword.length <= 1) return
    const manualHospital = createManualHospital({
      keyword: directHospitalKeyword,
      category: effectiveSearchCategory ?? "derma",
      region: toHospitalRegionCode(selectedRegion),
      regionLabel: selectedRegionLabel,
    })
    setSelectedHospital(manualHospital)
    setDirectHospitalName(directHospitalKeyword)
    setSelectedReviewIds([])
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
    setInputError("")
    scrollToReviewImport()
  }

  const handleToggleReview = (reviewId: string) => {
    setSelectedReviewIds((prevIds) =>
      prevIds.includes(reviewId) ? prevIds.filter((id) => id !== reviewId) : [...prevIds, reviewId]
    )
  }

  const handleSelectAll = () => {
    setSelectedReviewIds((prevIds) => (prevIds.length === reviews.length ? [] : reviews.map((review) => review.id)))
  }

  const handleClearSelection = () => {
    setSelectedReviewIds([])
  }

  const requireLoginForAnalysis = useCallback((force = false) => {
    if (isAuthLoading) {
      setInputError(t.auth.checkingLogin)
      setAnalyzeError("")
      return true
    }

    if (isAuthenticated && !force) return false

    const queryString = searchParams.toString()
    const nextPath = `${ROUTES.ANALYZE}${queryString ? `?${queryString}` : ""}`

    setInputError(t.analyze.analysisLoginRequired)
    setAnalyzeError("")
    showToast({
      title: t.analyze.analysisLoginRequired,
      description: t.auth.loginDescription,
      tone: "info",
    })
    router.push(`${ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`)
    return true
  }, [isAuthLoading, isAuthenticated, router, searchParams, showToast, t.analyze.analysisLoginRequired, t.auth.checkingLogin, t.auth.loginDescription])

  const analyzeWithApi = async ({
    hospital,
    hospitalName,
    reviewText,
    reviews: targetReviewTexts,
    reviewDates,
    selectedReviewCount,
    totalReviewCount,
  }: {
    hospital?: HospitalItem
    hospitalName: string
    reviewText?: string
    reviews?: string[]
    reviewDates?: string[]
    selectedReviewCount: number
    totalReviewCount: number
  }) => {
    if (requireLoginForAnalysis()) return

    setIsAnalyzing(true)
    setReviewFeedback(t.analyze.reviewInbox.analysisSendingFeedback)
    setAnalyzeError("")
    setInputError("")
    setAnalysisResult(null)
    setIsSaved(false)

    try {
      const resultCategory = hospital?.category ?? effectiveSearchCategory ?? "derma"
      const regionPayload = buildAnalysisRegionPayload(selectedRegion)
      const response = await reviewAnalysisService.analyzeReview({
        category: resultCategory,
        hospitalName,
        reviewText,
        reviews: targetReviewTexts,
        reviewDates,
        outputLanguage: language,
        region: selectedRegionLabel || undefined,
        ...buildHospitalMetadataPayload(hospital),
        ...buildAccessibilityMetadataPayload(hospital, accessibilityInput),
      })

      const nextAnalysisResult = createApiAnalysisResult({
        hospital,
        hospitalName,
        category: resultCategory,
        categoryKoLabel: translations.ko.categories[resultCategory],
        categoryEnLabel: translations.en.categories[resultCategory],
        regionPayload,
        response,
        userId,
        selectedReviewCount,
        totalReviewCount,
        accessibilityInput,
      })

      setAnalysisResult(nextAnalysisResult)
      writeCurrentReviewAnalysis({
        ...response,
        id: nextAnalysisResult.id,
        category: resultCategory,
        categoryKoLabel: translations.ko.categories[resultCategory],
        categoryEnLabel: translations.en.categories[resultCategory],
        ...regionPayload,
        hospitalAddress: nextAnalysisResult.hospitalAddress,
        roadAddress: nextAnalysisResult.roadAddress,
        address: nextAnalysisResult.address,
        region: nextAnalysisResult.region,
        regionId: nextAnalysisResult.regionId,
        regionLabel: nextAnalysisResult.regionLabel,
        regionKoLabel: nextAnalysisResult.regionKoLabel,
        regionEnLabel: nextAnalysisResult.regionEnLabel,
        regionProvinceCode: nextAnalysisResult.regionProvinceCode,
        regionDistrictCode: nextAnalysisResult.regionDistrictCode,
        hospitalName,
        hospitalNameKo: hospital?.hospitalNameKo,
        hospitalNameEn: nextAnalysisResult.hospitalNameEn,
        hospitalEnglishName: nextAnalysisResult.hospitalEnglishName,
        englishName: nextAnalysisResult.englishName,
        mapUrl: nextAnalysisResult.mapUrl,
        googleMapUrl: nextAnalysisResult.googleMapUrl,
        naverPlaceUrl: nextAnalysisResult.naverPlaceUrl,
        kakaoPlaceUrl: nextAnalysisResult.kakaoPlaceUrl,
        homepageUrl: nextAnalysisResult.homepageUrl,
        phone: nextAnalysisResult.phone,
        treatmentItems: nextAnalysisResult.treatmentItems,
        hasPhotos: nextAnalysisResult.hasPhotos,
        hasGooglePhotos: nextAnalysisResult.hasGooglePhotos,
        reviewText: reviewText ?? targetReviewTexts?.join("\n\n"),
        analyzedAt: nextAnalysisResult.analyzedAt ?? new Date().toISOString(),
      })
      // Charge only after the API completed and the result was saved. The usage event is idempotent by analysis ID.
      const charged = response.analysisResultId
        ? await chargeCompletedAnalysis(response.analysisResultId)
        : false
      if (!charged) throw new Error(language === "en" ? "Detailed analysis usage could not be charged." : "상세 분석 사용량을 확인하거나 차감하지 못했습니다.")
      router.push(ROUTES.RESULT)
    } catch (error) {
      setReviewFeedback("")

      if (error instanceof ApiClientError && error.status === 401) {
        requireLoginForAnalysis(true)
        return
      }

      if (error instanceof ApiClientError) {
        setAnalyzeError(
          t.analyze.analyzeErrorWithStatus
            .replace("{status}", String(error.status))
            .replace("{message}", error.message)
        )
        return
      }

      if (error instanceof Error) {
        setAnalyzeError(t.analyze.analyzeErrorWithMessage.replace("{message}", error.message))
        return
      }

      setAnalyzeError(t.analyze.analyzeError)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyzeDirectReview = async () => {
    const hospitalName = directHospitalName.trim()
    if (isAnalyzing) return
    const readyReviewTexts = analysisReadyReviewDrafts.map((review) => review.content.trim())
    const targetReviews =
      readyReviewTexts.length > 0
        ? readyReviewTexts
        : pendingReadyReviewTexts.length > 0
          ? pendingReadyReviewTexts
          : includedReviewDraftTexts.length > 0
            ? includedReviewDraftTexts
            : pendingReviewTexts

    if (targetReviews.length === 0) {
      setInputError(t.analyze.reviewInboxRequired)
      setAnalyzeError("")
      return
    }
    if (!hospitalName) {
      setInputError(t.analyze.hospitalInfoRequired)
      setAnalyzeError("")
      return
    }

    setReviewFeedback(t.analyze.reviewInbox.analysisPreparingFeedback.replace("{count}", String(targetReviews.length)))

    await analyzeWithApi({
      hospital: selectedHospital ?? undefined,
      hospitalName,
      reviewText: readyReviewTexts.length > 0 ? mergeReviewDraftsForAnalysis(analysisReadyReviewDrafts) : targetReviews.join("\n\n"),
      reviews: targetReviews,
      selectedReviewCount: targetReviews.length,
      totalReviewCount: reviewDrafts.length > 0 ? reviewDrafts.length : pendingReviewTexts.length,
    })
  }

  const handleAnalyzeHospitalReviews = async (hospital: HospitalItem, targetReviews: HospitalReviewItem[]) => {
    if (targetReviews.length === 0) return

    setSelectedHospital(hospital)
    await analyzeWithApi({
      hospital,
      hospitalName: hospital.name,
      reviews: targetReviews.map((review) => review.content),
      reviewDates: targetReviews.map((review) => review.visitDate ?? review.createdAt ?? ""),
      selectedReviewCount: targetReviews.length,
      totalReviewCount: hospital.reviewCount ?? targetReviews.length,
    })
  }

  const handleAnalyze = async (targetReviews: HospitalReviewItem[]) => {
    if (!selectedHospital) return
    await handleAnalyzeHospitalReviews(selectedHospital, targetReviews)
  }

  const handleFindAgain = () => {
    setSelectedHospital(null)
    setDirectHospitalName("")
    setSelectedReviewIds([])
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
    setInputError("")
  }

  const selectedHospitalRegionLabel = selectedHospital?.manualRegionLabel || (
    selectedHospital ? getHospitalRegionLabel(selectedHospital.region, language) : ""
  )

  const handleSwipe = (direction: "prev" | "next", totalPages: number, setPage: (updater: (page: number) => number) => void) => {
    setPage((page) => {
      if (direction === "prev") return Math.max(0, page - 1)
      return Math.min(totalPages - 1, page + 1)
    })
  }

  const handleTouchEnd = (
    clientX: number,
    totalPages: number,
    setPage: (updater: (page: number) => number) => void
  ) => {
    if (touchStartX === null) return
    const diff = touchStartX - clientX
    setTouchStartX(null)
    if (Math.abs(diff) < 36) return
    handleSwipe(diff > 0 ? "next" : "prev", totalPages, setPage)
  }

  const handleSave = async () => {
    if (!analysisResult) return
    await analysisHistoryService.saveAnalysisHistoryItem(analysisResult)
    setIsSaved(true)
    showToast({
      title: t.analyze.resultSavedToast,
      description: t.analyze.resultSavedToastDescription,
      tone: "success",
    })
  }

  const handleRestart = () => {
    setHasSearched(false)
    setResults([])
    setSelectedHospital(null)
    setSelectedReviewIds([])
    setAnalysisResult(null)
    setAnalyzeError("")
    setInputError("")
    setIsSaved(false)
    setAccessibilityInput(createEmptyAccessibilityEnhancement())
    setDirectHospitalName("")
    setDirectReviewText("")
    setReviewDrafts([])
    setReviewFeedback("")
    setScreenshotFileNames([])
    setUploadedReviewFileName("")
    clearSelectedRegion()
    setQuery("")
  }

  const renderProvinceButton = (province: RegionProvince) => {
    const label = province.label[currentLanguage]
    const isSelected = modalProvinceCode === province.code

    return (
      <button
        key={province.code}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        onClick={() => selectProvince(province)}
      >
        <span>{label}</span>
        {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
      </button>
    )
  }

  const renderDistrictButton = ({ province, district }: DistrictSearchResult) => {
    const provinceLabel = province.label[currentLanguage]
    const districtLabel = district.label[currentLanguage]
    const isSelected = selectedRegion?.provinceCode === province.code && selectedRegion.districtCode === district.code
    const displayLabel = trimmedRegionSearch ? `${provinceLabel} ${districtLabel}` : districtLabel

    return (
      <button
        key={`${province.code}-${district.code}`}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        onClick={() => selectDistrict(province, district)}
      >
        <span>{displayLabel}</span>
        {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
      </button>
    )
  }

  const selectedHospitalSummarySection = selectedHospital ? (
    <section className={`${styles.selectedHospitalCard} ${styles.stackSm}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.selectedHospitalTitle}</h2>
          <p className={styles.bodyText}>{getHospitalDisplayName(selectedHospital, language)}</p>
        </div>
        <button type="button" className={styles.smallPillButton} onClick={handleFindAgain}>
          {t.analyze.changeSelectedHospital}
        </button>
      </div>
      <div className={styles.selectedHospitalGrid}>
        {selectedHospitalRegionLabel && <span className={styles.neutralPill}>{selectedHospitalRegionLabel}</span>}
        <span className={styles.neutralPill}>{t.categories[selectedHospital.category]}</span>
      </div>
      {selectedHospital.isManual && <p className={styles.bodyText}>{t.analyze.manualHospitalNotice}</p>}
      {selectedHospital.address && <p className={styles.recordMeta}>{selectedHospital.address}</p>}
    </section>
  ) : null

  const selectedHospitalReviewSection = selectedHospital && reviews.length > 0 ? (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.reviewListTitle}</h2>
          <p className={styles.bodyText}>
            {selectedHospital.name} · {selectedHospitalRegionLabel}
          </p>
        </div>
      </div>

      <div className={styles.selectionToolbar}>
        <button type="button" className={styles.smallPillButton} onClick={handleSelectAll}>
          {t.analyze.selectAll}
        </button>
        <button type="button" className={styles.smallPillButton} onClick={handleClearSelection}>
          {t.analyze.clearSelection}
        </button>
        <span className={styles.neutralPill}>
          {t.analyze.selectedReviews} {selectedReviewIds.length}/{reviews.length}
        </span>
      </div>
      <div
        className={styles.reviewList}
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0, reviewTotalPages, setReviewPage)}
      >
        {visibleReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            checked={selectedReviewIds.includes(review.id)}
            onToggle={() => handleToggleReview(review.id)}
          />
        ))}
      </div>
      <PaginationControls
        currentPage={reviewPage}
        totalPages={reviewTotalPages}
        onPrev={() => handleSwipe("prev", reviewTotalPages, setReviewPage)}
        onNext={() => handleSwipe("next", reviewTotalPages, setReviewPage)}
      />
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={isAnalyzing || selectedReviews.length === 0}
          onClick={() => handleAnalyze(selectedReviews)}
        >
          {t.analyze.analyzeSelectedReviews}
        </button>
        <button type="button" className={styles.primaryButton} disabled={isAnalyzing} onClick={() => handleAnalyze(reviews)}>
          {t.analyze.analyzeAllReviews}
        </button>
      </div>
    </section>
  ) : null

  const reviewImportSection = selectedHospital ? (
    <section ref={reviewImportSectionRef} className={`${styles.card} ${styles.stackSm}`}>
      <div>
        <h2 className={styles.titleMd}>{t.analyze.reviewSourceTitle}</h2>
        <p className={styles.bodyText}>{t.analyze.reviewSourceDescription}</p>
      </div>
      <ReviewInputWorkspace
        value={directReviewText}
        reviews={reviewDrafts}
        summary={reviewInboxSummary}
        feedback={reviewFeedback}
        inputError={inputError}
        isAnalyzing={isAnalyzing}
        isAnalyzeDisabled={isReviewAnalysisDisabled}
        isExtractingScreenshotText={isExtractingScreenshotText}
        screenshotFileNames={screenshotFileNames}
        uploadedReviewFileName={uploadedReviewFileName}
        selectedHospital={selectedHospital}
        accessibilityInput={accessibilityInput}
        onChange={setDirectReviewText}
        onAccessibilityTextChange={handleAccessibilityTextChange}
        onAccessibilityBooleanChange={handleAccessibilityBooleanChange}
        onAddReviews={handleAddManualReviews}
        onReadScreenshotReviews={handleReadScreenshotReviews}
        onCombinedImportChange={handleCombinedReviewImportChange}
        onContentChange={handleReviewDraftContentChange}
        onToggleIncluded={handleToggleReviewDraft}
        onDelete={handleDeleteReviewDraft}
        onClear={handleClearReviewDrafts}
        onStartAnalysis={handleAnalyzeDirectReview}
      />
    </section>
  ) : null

  return (
    <>
    <section className={styles.stackMd}>
      <section className={`${styles.card} ${styles.hospitalFinderCard} ${styles.stackSm}`}>
        <div className={styles.hospitalFinderHeader}>
          <h2 className={styles.titleMd}>{t.analyze.hospitalFinderTitle}</h2>
          <p className={styles.bodyText}>{t.analyze.hospitalFinderDescription}</p>
        </div>

        <button type="button" className={styles.regionFinderButton} onClick={openRegionModal}>
          <MapPinned className={styles.iconSm} aria-hidden="true" />
          <span>{selectedRegionLabel || t.analyze.regionFinderPrompt}</span>
          <ChevronDown className={styles.iconXs} aria-hidden="true" />
        </button>

        <div className={styles.finderFieldGroup}>
          <span className={styles.mutedText}>{t.analyze.medicalCategoryLabel}</span>
          <div className={styles.categoryChipGrid} role="group" aria-label={t.analyze.medicalCategoryLabel}>
            {categorySheetItems.map(({ key, label, icon: Icon }, index) => (
              <button
                key={key}
                type="button"
                className={`${styles.categoryChipButton} ${category === key ? styles.categoryChipSelected : ""}`}
                data-tone={index === 0 ? "lavender" : index === 1 ? "mint" : "peach"}
                aria-pressed={category === key}
                onClick={() => (category === key ? clearSelectedCategory() : handleCategoryChange(key))}
              >
                <Icon className={styles.iconXs} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {hasSelectedSearchCondition ? (
          <article className={styles.selectedConditionCard}>
            <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
              <Check className={styles.iconSm} aria-hidden="true" />
            </span>
            <div>
              <span>{selectedRegion && !category ? t.analyze.selectedRegionLabel : t.analyze.selectedConditionTitle}</span>
              <strong>{searchResultContextLabel}</strong>
            </div>
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={() => (selectedRegion ? openRegionModal() : setIsCategorySheetOpen(true))}
            >
              {t.analyze.changeConditionButton}
            </button>
          </article>
        ) : (
          <p className={styles.finderDirectSearchText}>{t.analyze.directHospitalSearchIntro}</p>
        )}

        <label className={styles.label} htmlFor="hospital-search">
          <span className={styles.mutedText}>{t.analyze.searchNarrowLabel}</span>
          <div className={styles.hospitalSearchField}>
            <input
              id="hospital-search"
              className={styles.input}
              type="search"
              placeholder={hospitalSearchPlaceholder}
              value={query}
              onCompositionStart={() => setIsHospitalQueryComposing(true)}
              onCompositionEnd={(event) => {
                setIsHospitalQueryComposing(false)
                handleHospitalQueryChange(event.currentTarget.value)
              }}
              onChange={(event) => {
                if ((event.nativeEvent as InputEvent).isComposing) {
                  setQuery(event.target.value)
                  return
                }
                handleHospitalQueryChange(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  if (!event.nativeEvent.isComposing) void handleSearch()
                }
              }}
            />
            <button
              type="button"
              className={styles.hospitalSearchIconButton}
              aria-label={t.analyze.searchButton}
              disabled={isHospitalSearching || isHospitalQueryComposing}
              onClick={() => void handleSearch()}
            >
              {isHospitalSearching ? <LoaderCircle className={`${styles.iconXs} ${styles.spin}`} /> : <Search className={styles.iconXs} />}
            </button>
          </div>
        </label>

        {hasShortHospitalKeyword && <p className={styles.reviewDetectedText}>{t.analyze.shortHospitalKeywordGuide}</p>}

        <article className={styles.finderTipCard}>
          <strong>{t.analyze.searchTipTitle}</strong>
          <ul className={styles.finderTipList}>
            {t.analyze.searchTipItems.map((item) => (
              <li key={item} className={styles.finderTipItem}>
                <span className={styles.finderTipCheck} aria-hidden="true">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>

        {(hasSelectedSearchCondition || directHospitalKeyword || searchFiltersRelaxed) && (
          <div className={styles.finderResetRow}>
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={handleResetHospitalSearch}
            >
              {t.analyze.resetFilters}
            </button>
          </div>
        )}
      </section>

      {hasSearched && (
        <section className={styles.stackSm}>
          <div className={styles.searchResultHeader}>
            <div>
              <p className={styles.bodyText}>{searchResultMessage}</p>
              <h2 className={styles.titleSm}>
                {t.analyze.searchResultsCount.replace("{count}", String(filteredHospitals.length))}
              </h2>
            </div>
            {searchFiltersRelaxed && <span className={styles.neutralPill}>{t.analyze.filtersCleared}</span>}
          </div>
          {hospitalSearchError && (
            <article className={`${styles.emptyCard} ${styles.stackSm}`}>
              <h3 className={styles.titleSm}>{t.analyze.hospitalSearchFailed}</h3>
              <p className={styles.bodyText}>{t.analyze.hospitalSearchRetry}</p>
            </article>
          )}
          {isHospitalSearching ? (
            <article className={`${styles.emptyCard} ${styles.stackSm}`}>
              <LoaderCircle className={`${styles.iconLg} ${styles.spin}`} />
              <h3 className={styles.titleMd}>{t.analyze.hospitalSearching}</h3>
            </article>
          ) : filteredHospitals.length === 0 && hasShortHospitalKeyword ? (
            <article className={`${styles.emptyCard} ${styles.stackSm}`}>
              <p className={styles.bodyText}>{t.analyze.shortHospitalKeywordGuide}</p>
            </article>
          ) : filteredHospitals.length === 0 ? (
            <article className={`${styles.emptyCard} ${styles.hospitalNoResultCard} ${styles.stackSm}`}>
              <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
                <Search className={styles.iconSm} aria-hidden="true" />
              </span>
              <h3 className={styles.titleMd}>{t.analyze.noSearchResults}</h3>
              <p className={styles.bodyText}>{t.analyze.noSearchResultsDescription}</p>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleResetHospitalSearch}
              >
                {t.analyze.resetFilters}
              </button>
              {directHospitalKeyword.length >= 2 && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSelectManualHospital}
                >
                  {t.analyze.selectHospitalNameDirectly.replace("{hospitalName}", directHospitalKeyword)}
                </button>
              )}
            </article>
          ) : (
            <>
              <HospitalSearchMap hospitals={filteredHospitals} selectedHospital={selectedHospital} onSelect={handleOpenReviews} />
              {selectedHospitalSummarySection}
              <div
                className={styles.paginatedPanel}
                onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
                onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0, hospitalTotalPages, setHospitalPage)}
              >
                {visibleHospitals.map((hospital) => (
                  <HospitalResultCard
                    key={hospital.id}
                    hospital={hospital}
                    regionLabel={getHospitalRegionLabel(hospital.region, language)}
                    onSelect={() => handleOpenReviews(hospital)}
                  />
                ))}
              </div>
              <PaginationControls
                currentPage={hospitalPage}
                totalPages={hospitalTotalPages}
                onPrev={() => handleSwipe("prev", hospitalTotalPages, setHospitalPage)}
                onNext={() => handleSwipe("next", hospitalTotalPages, setHospitalPage)}
              />
            </>
          )}
        </section>
      )}

      {!(hasSearched && !isHospitalSearching && filteredHospitals.length > 0) && selectedHospitalSummarySection}

      {selectedHospitalReviewSection}

      {reviewImportSection}

      {isAnalyzing && (
        <section className={`${styles.emptyCard} ${styles.stackSm}`}>
          <LoaderCircle className={`${styles.iconLg} ${styles.spin}`} />
          <h2 className={styles.titleMd}>{t.analyze.loading}</h2>
          <p className={styles.bodyText}>{t.analyze.loadingSub}</p>
        </section>
      )}

      {analyzeError && (
        <section className={styles.emptyCard}>
          <p className={styles.bodyText}>{analyzeError}</p>
        </section>
      )}

      {analysisResult && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.rowBetween}>
            <h2 className={styles.titleMd}>{t.analyze.analysisResult}</h2>
            <span className={styles.scoreSmall}>{analysisResult.trustScore}/100</span>
          </div>
          <div className={styles.resultMetricGrid}>
            <Metric label={t.analyze.overallTrustScore} value={`${analysisResult.trustScore}/100`} />
            <Metric label={t.analyze.trustLevel} value={analysisResult.trustGrade ?? trustLevelLabel(t, analysisResult.trustLevel, analysisResult.trustScore)} />
            <Metric label={t.analyze.adSuspicionLevel} value={analysisResult.adSuspicion ?? levelLabel(t, analysisResult.adSuspicionLevel)} />
            <Metric label={t.analyze.informationLevel} value={analysisResult.informationLevel ?? levelLabel(t, analysisResult.concreteExperienceLevel)} />
            <Metric label={t.analyze.modelVersion} value={analysisResult.modelVersion ?? "mock"} />
            <Metric label={t.analyze.repetitivePattern} value={levelLabel(t, analysisResult.repetitivePatternLevel)} />
            <Metric label={t.analyze.concreteExperience} value={levelLabel(t, analysisResult.concreteExperienceLevel)} />
            <Metric
              label={t.analyze.foreignAccessibility}
              value={`${analysisResult.globalAccessibilityScore ?? 0}${t.result.pointsSuffix}`}
            />
          </div>
          <p className={styles.bodyText}>{analysisResult.summary}</p>
          <div className={styles.badgeRow}>
            <span className={styles.neutralPill}>
              {t.analyze.selectedReviewCount} {analysisResult.selectedReviewCount}
            </span>
            <span className={styles.neutralPill}>
              {t.analyze.totalReviewCount} {analysisResult.totalReviewCount}
            </span>
            {typeof analysisResult.positiveRatio === "number" && (
              <span className={styles.neutralPill}>
                {t.analyze.positiveRatio} {analysisResult.positiveRatio}%
              </span>
            )}
            {typeof analysisResult.negativeRatio === "number" && (
              <span className={styles.neutralPill}>
                {t.analyze.negativeRatio} {analysisResult.negativeRatio}%
              </span>
            )}
          </div>
          {analysisResult.recommendation && <p className={styles.bodyText}>{analysisResult.recommendation}</p>}
          <PhraseList title={t.analyze.detectedPatterns} items={analysisResult.detectedPatterns ?? []} />
          <PhraseList title={t.analyze.suspiciousPhrases} items={analysisResult.suspiciousPhrases ?? []} />
          <PhraseList title={t.analyze.repetitivePhrases} items={analysisResult.repetitivePhrases ?? []} />
          <PhraseList title={t.analyze.trustworthyPhrases} items={analysisResult.trustworthyPhrases ?? []} />
          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={handleRestart}>
              {t.analyze.restartFlow}
            </button>
            <button type="button" className={styles.primaryButton} disabled={isSaved} onClick={handleSave}>
              <FileCheck2 className={styles.iconSm} />
              {isSaved ? t.analyze.savedToHistory : t.analyze.saveToHistory}
            </button>
          </div>
        </section>
      )}
    </section>
    {isRegionModalOpen ? (
      <div className={styles.regionModalBackdrop} role="presentation" onClick={() => setIsRegionModalOpen(false)}>
        <section
          className={styles.regionModalCard}
          role="dialog"
          aria-modal="true"
          aria-labelledby="analyze-region-modal-title"
          aria-describedby="analyze-region-modal-description"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.regionSheetHeader}>
            <div>
              <h2 id="analyze-region-modal-title" className={styles.regionSheetTitle}>{t.analyze.regionPicker.title}</h2>
              <p id="analyze-region-modal-description">{t.analyze.regionPicker.description}</p>
            </div>
            <button
              type="button"
              className={styles.regionSheetCloseButton}
              aria-label={t.analyze.regionPicker.closeAriaLabel}
              onClick={() => setIsRegionModalOpen(false)}
            >
              <X className={styles.iconMd} aria-hidden="true" />
            </button>
          </div>

          <label className={styles.regionSearchField}>
            <Search className={styles.iconSm} aria-hidden="true" />
            <input
              ref={regionSearchRef}
              value={regionSearch}
              onChange={(event) => setRegionSearch(event.target.value)}
              placeholder={t.analyze.regionPicker.searchPlaceholder}
            />
          </label>

          {selectedModalProvince ? (
            <section className={styles.regionSummary} aria-label={t.analyze.regionPicker.selectedTitle}>
              <div>
                <p className={styles.regionSummaryLabel}>{t.analyze.regionPicker.selectedTitle}</p>
                <div className={styles.regionSummaryChips}>
                  <span className={styles.regionSummaryChip}>{selectedModalProvince.label[currentLanguage]}</span>
                </div>
              </div>
              <button type="button" className={styles.regionBackButton} onClick={resetProvinceSelection}>
                {t.analyze.regionPicker.changeProvince}
              </button>
            </section>
          ) : null}

          <div className={styles.regionModalBody}>
            {trimmedRegionSearch ? (
              hasRegionSearchResults ? (
                <>
                  {filteredProvinces.length > 0 ? (
                    <div className={styles.regionSection}>
                      <h3>{t.analyze.regionPicker.provinceTitle}</h3>
                      <div className={styles.regionOptionGrid}>{filteredProvinces.map(renderProvinceButton)}</div>
                    </div>
                  ) : null}
                  {filteredDistricts.length > 0 ? (
                    <div className={styles.regionSection}>
                      <h3>{t.analyze.regionPicker.districtTitle}</h3>
                      <div className={styles.regionOptionGrid}>{filteredDistricts.map(renderDistrictButton)}</div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={styles.regionNoResults}>{t.analyze.regionPicker.noResults}</p>
              )
            ) : selectedModalProvince ? (
              <div className={styles.regionSection}>
                <h3>{t.analyze.regionPicker.selectDistrictTitle}</h3>
                <div className={styles.regionOptionGrid}>
                  {districtOptions.map((district) => renderDistrictButton({
                    province: selectedModalProvince,
                    district,
                  }))}
                </div>
              </div>
            ) : (
              <div className={styles.regionSection}>
                <h3>{t.analyze.regionPicker.selectProvinceTitle}</h3>
                <div className={styles.regionOptionGrid}>{KOREA_REGION_OPTIONS.map(renderProvinceButton)}</div>
              </div>
            )}
          </div>
        </section>
      </div>
    ) : null}
    {isCategorySheetOpen ? (
      <div className={styles.regionModalBackdrop} role="presentation" onClick={() => setIsCategorySheetOpen(false)}>
        <section
          className={styles.categorySheetCard}
          role="dialog"
          aria-modal="true"
          aria-labelledby="analyze-category-sheet-title"
          aria-describedby="analyze-category-sheet-description"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.regionSheetHeader}>
            <div>
              <h2 id="analyze-category-sheet-title" className={styles.regionSheetTitle}>{t.analyze.categorySheetTitle}</h2>
              <p id="analyze-category-sheet-description">{t.analyze.categorySheetDescription}</p>
            </div>
            <button
              type="button"
              className={styles.regionSheetCloseButton}
              aria-label={t.analyze.regionPicker.closeAriaLabel}
              onClick={() => setIsCategorySheetOpen(false)}
            >
              <X className={styles.iconMd} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.categorySheetList}>
            {categorySheetItems.map(({ key, label, desc, icon: Icon }) => {
              const isSelected = category === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.categorySheetOption} ${isSelected ? styles.categorySheetOptionSelected : ""}`}
                  onClick={() => handleCategoryChange(key)}
                >
                  <span className={styles.iconBoxSmall}>
                    <Icon className={styles.iconSm} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                  {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    ) : null}
    </>
  )
}

function ReviewInputWorkspace({
  value,
  reviews,
  summary,
  feedback,
  inputError,
  isAnalyzing,
  isAnalyzeDisabled,
  isExtractingScreenshotText,
  screenshotFileNames,
  uploadedReviewFileName,
  selectedHospital,
  accessibilityInput,
  onChange,
  onAccessibilityTextChange,
  onAccessibilityBooleanChange,
  onAddReviews,
  onReadScreenshotReviews,
  onCombinedImportChange,
  onContentChange,
  onToggleIncluded,
  onDelete,
  onClear,
  onStartAnalysis,
}: {
  value: string
  reviews: ReviewDraft[]
  summary: { totalCount: number; shortCount: number; duplicateCount: number; readyCount: number }
  feedback: string
  inputError: string
  isAnalyzing: boolean
  isAnalyzeDisabled: boolean
  isExtractingScreenshotText: boolean
  screenshotFileNames: string[]
  uploadedReviewFileName: string
  selectedHospital: HospitalItem | null
  accessibilityInput: AccessibilityEnhancementInput
  onChange: (value: string) => void
  onAccessibilityTextChange: (field: "googleMapUrl" | "homepageUrl" | "phone" | "treatmentItems" | "englishName", value: string) => void
  onAccessibilityBooleanChange: (field: "hasEnglishInfo" | "hasEnglishReviews" | "hasGooglePhotos" | "hasPhotos", value: boolean | null) => void
  onAddReviews: () => void
  onReadScreenshotReviews: () => void
  onCombinedImportChange: (event: ChangeEvent<HTMLInputElement>) => void
  onContentChange: (reviewId: string, content: string) => void
  onToggleIncluded: (reviewId: string) => void
  onDelete: (reviewId: string) => void
  onClear: () => void
  onStartAnalysis: () => void
}) {
  const { t } = useLanguage()
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [activeExampleCategory, setActiveExampleCategory] = useState<ReviewExampleCategory>("kindness")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const detectedCount = splitReviewText(value).length
  const currentGuideCount = Math.max(detectedCount, summary.readyCount)
  const reviewCountGuide =
    currentGuideCount === 0
      ? t.analyze.reviewInbox.reviewCountGuideEmpty
      : currentGuideCount < 5
        ? t.analyze.reviewInbox.reviewCountGuideFew
        : currentGuideCount < 10
          ? t.analyze.reviewInbox.reviewCountGuideLimited
          : t.analyze.reviewInbox.reviewCountGuideEnough
  const hasReviewText = value.trim().length > 0
  const reviewExamples = t.analyze.reviewExamples
  const activeSentences = reviewExamples.sentences[activeExampleCategory]

  const addReviewExample = (sentence: string) => {
    const nextValue = value.trim() ? `${value.trim()}\n\n${sentence}` : sentence
    onChange(nextValue)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <section className={styles.reviewInputWorkspace}>
      <div className={styles.reviewImportToolbar}>
        <button type="button" className={styles.reviewImportButton} onClick={() => textareaRef.current?.focus()}>
          <Pencil className={styles.iconXs} aria-hidden="true" />
          <span>
            <strong>{t.analyze.pasteReviewButton}</strong>
            <small>{t.analyze.pasteReviewSubtext}</small>
          </span>
        </button>
        <label className={styles.reviewImportButton} htmlFor="review-import-input">
          <UploadCloud className={styles.iconXs} aria-hidden="true" />
          <span>
            <strong>{t.analyze.importImageFileButton}</strong>
            <small>{t.analyze.importImageFileSubtext}</small>
          </span>
        </label>
        <input
          id="review-import-input"
          className={styles.visuallyHidden}
          type="file"
          accept="image/png,image/jpeg,image/webp,.txt,.csv,text/plain,text/csv"
          multiple
          onChange={onCombinedImportChange}
        />
      </div>

      <div className={styles.reviewImportHints}>
        <span>{t.analyze.imageImportSupportText}</span>
        <span>{t.analyze.fileSupportText}</span>
      </div>

      <VisitInfoAssistPanel
        selectedHospital={selectedHospital}
        value={accessibilityInput}
        onTextChange={onAccessibilityTextChange}
        onBooleanChange={onAccessibilityBooleanChange}
      />

      <Link href={`${ROUTES.HELP}?topic=review-input`} className={styles.reviewInputHelpCard}>
        <span className={styles.analysisHelpIcon}>
          <HelpCircle className={styles.iconSm} />
        </span>
        <span>
          <strong>{t.help.reviewInputHelpTitle}</strong>
          <small>{t.help.reviewInputHelpDescription}</small>
        </span>
        <ChevronRight className={styles.iconSm} />
      </Link>

      {(screenshotFileNames.length > 0 || uploadedReviewFileName) && (
        <div className={styles.fileNameList}>
          {screenshotFileNames.map((fileName) => (
            <span key={fileName}>{fileName}</span>
          ))}
          {uploadedReviewFileName && <span>{uploadedReviewFileName}</span>}
        </div>
      )}

      {screenshotFileNames.length > 0 && (
        <button
          type="button"
          className={styles.reviewImportTextButton}
          disabled={isExtractingScreenshotText}
          onClick={onReadScreenshotReviews}
        >
          {isExtractingScreenshotText ? t.analyze.extractingScreenshotButton : t.analyze.readScreenshotButton}
        </button>
      )}

      <div className={styles.reviewTextHeader}>
        <label className={styles.reviewInputLabel} htmlFor="direct-review-text">
          {t.analyze.reviewTextTitle}
        </label>
        <p className={styles.reviewTextHelp}>{t.analyze.manualImportDescription}</p>
      </div>
      <textarea
        ref={textareaRef}
        id="direct-review-text"
        className={`${styles.textarea} ${styles.reviewPasteTextarea}`}
        placeholder={t.analyze.reviewPlaceholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {inputError && <p className={styles.reviewFeedback}>{inputError}</p>}

      <div className={styles.reviewExampleToggleRow}>
        <button
          type="button"
          className={styles.reviewExampleToggle}
          aria-expanded={examplesOpen}
          onClick={() => setExamplesOpen((current) => !current)}
        >
          {examplesOpen ? reviewExamples.closeButton : reviewExamples.openButton}
        </button>
      </div>

      {examplesOpen && (
        <section className={styles.reviewExamplePanel}>
          <div className={styles.reviewExampleHeader}>
            <div>
              <h3 className={styles.titleSm}>{reviewExamples.title}</h3>
              <p className={styles.bodyText}>{reviewExamples.description}</p>
            </div>
            <button type="button" className={styles.smallPillButton} onClick={() => setExamplesOpen(false)}>
              {reviewExamples.closeButton}
            </button>
          </div>
          <div className={styles.reviewExampleTabs} role="tablist" aria-label={reviewExamples.title}>
            {REVIEW_EXAMPLE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeExampleCategory === category}
                className={`${styles.reviewExampleTab} ${activeExampleCategory === category ? styles.reviewExampleTabActive : ""}`}
                onClick={() => setActiveExampleCategory(category)}
              >
                {reviewExamples.categories[category]}
              </button>
            ))}
          </div>
          <div className={styles.reviewExampleSentenceList}>
            {activeSentences.map((sentence) => (
              <button
                key={sentence}
                type="button"
                className={styles.reviewExampleSentence}
                onClick={() => addReviewExample(sentence)}
              >
                {sentence}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className={styles.reviewInputFooter}>
        <span className={styles.reviewDetectedText} aria-live="polite">
          {t.analyze.detectedReviewCount.replace("{count}", String(detectedCount))}
        </span>
        <button
          type="button"
          className={styles.reviewAddButton}
          disabled={!hasReviewText}
          onClick={onAddReviews}
        >
          {t.analyze.addToReviewQueue}
        </button>
      </div>

      <article className={`${styles.reviewMinimumGuide} ${styles.reviewCountGuide}`}>
        <strong>{t.analyze.reviewInbox.reviewCountGuideTitle}</strong>
        <p>{reviewCountGuide.replace("{count}", String(currentGuideCount))}</p>
        <small>{t.analyze.reviewInbox.reviewCountGuideHelper}</small>
      </article>

      <ReviewStatusPanel
        reviews={reviews}
        summary={summary}
        feedback={feedback}
        onContentChange={onContentChange}
        onToggleIncluded={onToggleIncluded}
        onDelete={onDelete}
        onClear={onClear}
        isAnalyzing={isAnalyzing}
        isAnalyzeDisabled={isAnalyzeDisabled}
        onStartAnalysis={onStartAnalysis}
      />
    </section>
  )
}

function VisitInfoAssistPanel({
  selectedHospital,
  value,
  onTextChange,
  onBooleanChange,
}: {
  selectedHospital: HospitalItem | null
  value: AccessibilityEnhancementInput
  onTextChange: (field: "googleMapUrl" | "homepageUrl" | "phone" | "treatmentItems" | "englishName", value: string) => void
  onBooleanChange: (field: "hasEnglishInfo" | "hasEnglishReviews" | "hasGooglePhotos" | "hasPhotos", value: boolean | null) => void
}) {
  const { t } = useLanguage()
  const sourceName = selectedHospital?.sourceName?.toLowerCase() ?? ""
  const providerName = String(selectedHospital?.provider ?? "").toLowerCase()
  const isNaverSource = sourceName.includes("naver") || sourceName.includes("네이버") || providerName.includes("naver")
  const naverPlaceHref = selectedHospital ? buildNaverPlaceHref(selectedHospital, isNaverSource) : undefined
  const rawSelectedMapLink =
    naverPlaceHref ||
    selectedHospital?.naverPlaceUrl ||
    selectedHospital?.kakaoPlaceUrl ||
    selectedHospital?.googleMapUrl ||
    selectedHospital?.mapUrl
  const selectedMapLink = (() => {
    if (!rawSelectedMapLink) return undefined
    const info = classifyMapUrl(rawSelectedMapLink)
    const isSupportedMapUrl = Boolean(info.naverPlaceUrl || info.kakaoPlaceUrl || info.googleMapUrl)
    return isSupportedMapUrl ? rawSelectedMapLink : undefined
  })()
  const selectedHomepageLink = selectedHospital?.homepageUrl
  const englishName = selectedHospital?.hospitalEnglishName || selectedHospital?.hospitalNameEn || selectedHospital?.englishName

  return (
    <section className={styles.visitInfoAssistPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.titleSm}>{t.analyze.visitInfoAssistTitle}</h3>
          <p className={styles.bodyText}>{t.analyze.visitInfoAssistDescription}</p>
        </div>
      </div>

      {(selectedMapLink || selectedHomepageLink) && (
        <div className={styles.visitInfoQuickActions}>
          {/* 검색 결과에서 확인한 지도/홈페이지 링크를 분석 보조 정보로 바로 채울 수 있게 한다. */}
          {selectedMapLink && (
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={() => onTextChange("googleMapUrl", selectedMapLink)}
            >
              <LinkIcon className={styles.iconXs} aria-hidden="true" />
              {t.analyze.useSelectedMapLink}
            </button>
          )}
          {selectedHomepageLink && (
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={() => onTextChange("homepageUrl", selectedHomepageLink)}
            >
              <LinkIcon className={styles.iconXs} aria-hidden="true" />
              {t.analyze.useSelectedHomepageLink}
            </button>
          )}
          {naverPlaceHref && <SourceLink href={naverPlaceHref} label={t.analyze.naverOriginalLink} />}
        </div>
      )}

      <div className={styles.visitInfoFieldGrid}>
        <label className={styles.label} htmlFor="analysis-map-link">
          <span className={styles.mutedText}>{t.analyze.googleMapUrlLabel}</span>
          <input
            id="analysis-map-link"
            className={styles.input}
            value={value.googleMapUrl}
            onChange={(event) => onTextChange("googleMapUrl", event.target.value)}
            placeholder={t.analyze.mapUrlPlaceholder}
          />
        </label>
        <label className={styles.label} htmlFor="analysis-homepage-link">
          <span className={styles.mutedText}>{t.analyze.homepageUrlLabel}</span>
          <input
            id="analysis-homepage-link"
            className={styles.input}
            value={value.homepageUrl}
            onChange={(event) => onTextChange("homepageUrl", event.target.value)}
            placeholder={t.analyze.homepageUrlPlaceholder}
          />
        </label>
        <label className={styles.label} htmlFor="analysis-phone">
          <span className={styles.mutedText}>{t.analyze.phoneInfoLabel}</span>
          <input
            id="analysis-phone"
            className={styles.input}
            value={value.phone}
            onChange={(event) => onTextChange("phone", event.target.value)}
            placeholder={selectedHospital?.phone || t.analyze.phoneInfoPlaceholder}
          />
        </label>
        <label className={styles.label} htmlFor="analysis-treatment-items">
          <span className={styles.mutedText}>{t.analyze.treatmentInfoLabel}</span>
          <input
            id="analysis-treatment-items"
            className={styles.input}
            value={value.treatmentItems}
            onChange={(event) => onTextChange("treatmentItems", event.target.value)}
            placeholder={selectedHospital?.treatmentItems || t.analyze.treatmentInfoPlaceholder}
          />
        </label>
        <label className={styles.label} htmlFor="analysis-english-name">
          <span className={styles.mutedText}>{t.analyze.englishNameLabel}</span>
          <input
            id="analysis-english-name"
            className={styles.input}
            value={value.englishName}
            onChange={(event) => onTextChange("englishName", event.target.value)}
            placeholder={englishName || t.analyze.englishNamePlaceholder}
          />
        </label>
      </div>

      <div className={styles.visitInfoToggleGrid}>
        <label className={styles.visitInfoToggle}>
          <input
            type="checkbox"
            checked={value.hasEnglishInfo === true}
            onChange={(event) => onBooleanChange("hasEnglishInfo", event.target.checked ? true : null)}
          />
          <span>{t.analyze.hasEnglishInfoLabel}</span>
        </label>
        <label className={styles.visitInfoToggle}>
          <input
            type="checkbox"
            checked={value.hasEnglishReviews === true}
            onChange={(event) => onBooleanChange("hasEnglishReviews", event.target.checked ? true : null)}
          />
          <span>{t.analyze.hasEnglishReviewsLabel}</span>
        </label>
        <label className={styles.visitInfoToggle}>
          <input
            type="checkbox"
            checked={value.hasPhotos === true || value.hasGooglePhotos === true}
            onChange={(event) => onBooleanChange("hasPhotos", event.target.checked ? true : null)}
          />
          <span>{t.analyze.hasPhotosLabel}</span>
        </label>
      </div>
    </section>
  )
}

function ReviewStatusPanel({
  reviews,
  summary,
  feedback,
  onContentChange,
  onToggleIncluded,
  onDelete,
  onClear,
  isAnalyzing,
  isAnalyzeDisabled,
  onStartAnalysis,
}: {
  reviews: ReviewDraft[]
  summary: { totalCount: number; shortCount: number; duplicateCount: number; readyCount: number }
  feedback: string
  onContentChange: (reviewId: string, content: string) => void
  onToggleIncluded: (reviewId: string) => void
  onDelete: (reviewId: string) => void
  onClear: () => void
  isAnalyzing: boolean
  isAnalyzeDisabled: boolean
  onStartAnalysis: () => void
}) {
  const { t } = useLanguage()
  const [showAllReviews, setShowAllReviews] = useState(false)
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <section className={styles.reviewStatusPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.titleSm}>{t.analyze.importedReviewsTitle}</h3>
          {reviews.length > 0 && (
            <p className={styles.bodyText}>
              {t.analyze.reviewInbox.importedCount.replace("{count}", String(summary.totalCount))}
            </p>
          )}
        </div>
        {reviews.length > 0 && (
          <button type="button" className={styles.smallPillButton} onClick={onClear}>
            {t.analyze.reviewInbox.clearAll}
          </button>
        )}
      </div>
      {reviews.length > 0 && (
        <div className={styles.reviewInboxSummaryGrid}>
          <Metric label={t.analyze.reviewInbox.readyCount} value={summary.readyCount} />
          <Metric label={t.analyze.reviewInbox.shortCount} value={summary.shortCount} />
          <Metric label={t.analyze.reviewInbox.duplicateCount} value={summary.duplicateCount} />
        </div>
      )}
      {feedback && <p className={styles.reviewFeedback}>{feedback}</p>}
      {reviews.length === 0 ? (
        <article className={styles.reviewMinimumGuide}>
          <p className={styles.mutedText}>{t.analyze.reviewInbox.minimumReviewGuide}</p>
        </article>
      ) : (
        <section className={styles.reviewPreviewPanel}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.titleSm}>{t.analyze.reviewInbox.previewTitle}</h3>
            {reviews.length > 3 && !showAllReviews && (
              <button type="button" className={styles.textButton} onClick={() => setShowAllReviews(true)}>
                {t.analyze.reviewInbox.viewAll}
              </button>
            )}
          </div>
          <div className={styles.reviewDraftList}>
            {visibleReviews.map((review, index) => (
              <ReviewDraftCard
                key={review.id}
                review={review}
                index={index}
                onContentChange={onContentChange}
                onToggleIncluded={onToggleIncluded}
                onDelete={onDelete}
              />
            ))}
          </div>
          {!showAllReviews && <p className={styles.mutedText}>{t.analyze.reviewInbox.partialPreviewNotice}</p>}
        </section>
      )}
      {reviews.length > 0 && (
        <div className={styles.reviewStartPanel}>
          {summary.readyCount === 0 && (
            <p className={styles.reviewFeedback}>{t.analyze.reviewInboxRequired}</p>
          )}
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.reviewAnalyzeButton}`}
            disabled={isAnalyzeDisabled || summary.readyCount === 0}
            onClick={onStartAnalysis}
          >
            {isAnalyzing && <LoaderCircle className={`${styles.iconSm} ${styles.spin}`} />}
            {isAnalyzing ? t.analyze.submitting : t.analyze.analyzeSelectedReviews}
          </button>
        </div>
      )}
    </section>
  )
}

function ReviewDraftCard({
  review,
  index,
  onContentChange,
  onToggleIncluded,
  onDelete,
}: {
  review: ReviewDraft
  index: number
  onContentChange: (reviewId: string, content: string) => void
  onToggleIncluded: (reviewId: string) => void
  onDelete: (reviewId: string) => void
}) {
  const { t } = useLanguage()

  return (
    <article className={`${styles.reviewDraftCard} ${!review.included ? styles.reviewDraftExcluded : ""}`}>
      <div className={styles.reviewDraftHeader}>
        <strong>{t.analyze.reviewInbox.reviewNumber.replace("{number}", String(index + 1))}</strong>
        <div className={styles.badgeRow}>
          <span className={styles.statusBadge}>{t.analyze.reviewInbox.sourceLabels[review.source]}</span>
          <span className={styles.statusBadge}>{t.analyze.reviewInbox.statusLabels[review.status]}</span>
        </div>
      </div>
      <label className={styles.reviewIncludeToggle}>
        <input type="checkbox" checked={review.included} onChange={() => onToggleIncluded(review.id)} />
        <span>{t.analyze.reviewInbox.includeInAnalysis}</span>
      </label>
      <label className={styles.label} htmlFor={`review-draft-${review.id}`}>
        <span className={styles.reviewEditLabel}>
          <Pencil className={styles.iconXs} aria-hidden="true" />
          {t.analyze.reviewInbox.editLabel}
        </span>
        <textarea
          id={`review-draft-${review.id}`}
          className={styles.reviewDraftTextarea}
          value={review.content}
          onChange={(event) => onContentChange(review.id, event.target.value)}
        />
      </label>
      <button type="button" className={styles.reviewDeleteButton} onClick={() => onDelete(review.id)}>
        <Trash2 className={styles.iconXs} aria-hidden="true" />
        {t.analyze.reviewInbox.deleteButton}
      </button>
    </article>
  )
}

function HospitalSearchMap({
  hospitals,
  selectedHospital,
  onSelect,
}: {
  hospitals: HospitalItem[]
  selectedHospital: HospitalItem | null
  onSelect: (hospital: HospitalItem) => void
}) {
  const { t } = useLanguage()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null)
  const mapOpenButtonRef = useRef<HTMLButtonElement | null>(null)
  const onSelectRef = useRef(onSelect)
  const wasMapModalOpenRef = useRef(false)
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const mapHospitals = useMemo(
    () => hospitals.filter(hasValidKoreaCoordinate),
    [hospitals]
  )
  const selectedMapHospital = useMemo(() => {
    if (!selectedHospital || !hasValidKoreaCoordinate(selectedHospital)) return null
    return mapHospitals.some((hospital) => hospital.id === selectedHospital.id) ? selectedHospital : null
  }, [mapHospitals, selectedHospital])
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const focusHospitalOnMap = useCallback((hospital: HospitalItem, level = 3) => {
    const kakaoMaps = (window as KakaoMapsWindow).kakao?.maps
    const map = mapInstanceRef.current
    if (!map || !kakaoMaps || !hasValidKoreaCoordinate(hospital)) return false

    const { latitude, longitude } = getHospitalCoordinate(hospital)
    const position = new kakaoMaps.LatLng(latitude, longitude)
    map.setCenter(position)
    map.setLevel(level)
    return true
  }, [])

  useEffect(() => {
    if (!mapKey || mapHospitals.length === 0 || !mapRef.current) {
      setMapStatus("idle")
      return
    }
    let resizeObserver: ResizeObserver | null = null
    let isActive = true
    setMapStatus("loading")

    const initializeMap = () => {
      const kakaoMaps = (window as KakaoMapsWindow).kakao?.maps
      if (!isActive || !mapRef.current) return
      if (!kakaoMaps) {
        setMapStatus("error")
        return
      }

      try {
        // 검색 결과 중 좌표가 있는 병원만 지도에 표시하고, 마커를 누르면 해당 병원이 선택된다.
        const first = mapHospitals[0]
        const firstCoordinate = getHospitalCoordinate(first)
        const center = new kakaoMaps.LatLng(firstCoordinate.latitude ?? 37.5665, firstCoordinate.longitude ?? 126.978)
        mapRef.current.replaceChildren()
        const map = new kakaoMaps.Map(mapRef.current, { center, level: 5 })
        mapInstanceRef.current = map
        const bounds = new kakaoMaps.LatLngBounds()

        mapHospitals.forEach((hospital) => {
          if (!hasValidKoreaCoordinate(hospital)) return
          const { latitude, longitude } = getHospitalCoordinate(hospital)
          const position = new kakaoMaps.LatLng(latitude, longitude)
          bounds.extend(position)
          const marker = new kakaoMaps.Marker({ position, map })
          kakaoMaps.event.addListener(marker, "click", () => {
            focusHospitalOnMap(hospital)
            onSelectRef.current(hospital)
          })
        })

        const fitMapToResults = () => {
          if (!isActive) return
          map.relayout()
          if (mapHospitals.length > 1) map.setBounds(bounds)
        }

        window.requestAnimationFrame(() => {
          window.setTimeout(fitMapToResults, 80)
        })

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            fitMapToResults()
          })
          resizeObserver.observe(mapRef.current)
        }
        setMapStatus("ready")
      } catch {
        if (isActive) setMapStatus("error")
      }
    }

    const loadKakaoMap = () => {
      ;(window as KakaoMapsWindow).kakao?.maps?.load(initializeMap)
    }
    const handleScriptError = () => {
      if (isActive) setMapStatus("error")
    }

    const existingScript = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null
    if (existingScript) {
      if ((window as KakaoMapsWindow).kakao?.maps) {
        loadKakaoMap()
      } else {
        existingScript.addEventListener("load", loadKakaoMap, { once: true })
        existingScript.addEventListener("error", handleScriptError, { once: true })
      }
      return () => {
        isActive = false
        mapInstanceRef.current = null
        resizeObserver?.disconnect()
        existingScript.removeEventListener("load", loadKakaoMap)
        existingScript.removeEventListener("error", handleScriptError)
      }
    }

    const script = document.createElement("script")
    script.id = "kakao-map-sdk"
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${mapKey}&autoload=false`
    script.onload = loadKakaoMap
    script.onerror = handleScriptError
    document.head.appendChild(script)

    return () => {
      isActive = false
      mapInstanceRef.current = null
      resizeObserver?.disconnect()
      script.onload = null
      script.onerror = null
      script.removeEventListener("load", loadKakaoMap)
      script.removeEventListener("error", handleScriptError)
    }
  }, [focusHospitalOnMap, mapHospitals, mapKey])

  useEffect(() => {
    if (mapStatus !== "ready" || !selectedMapHospital) return
    focusHospitalOnMap(selectedMapHospital)
  }, [focusHospitalOnMap, mapStatus, selectedMapHospital])

  useEffect(() => {
    if (wasMapModalOpenRef.current && !isMapModalOpen) {
      mapOpenButtonRef.current?.focus()
    }
    wasMapModalOpenRef.current = isMapModalOpen
  }, [isMapModalOpen])

  const handleZoomSelectedHospital = () => {
    if (!selectedMapHospital) return
    focusHospitalOnMap(selectedMapHospital)
  }

  const handleOpenMapModal = () => {
    if (mapStatus !== "ready") return
    setIsMapModalOpen(true)
  }

  if (!mapKey || mapHospitals.length === 0) return null

  return (
    <>
      <article className={`${styles.card} ${styles.hospitalMapPanel}`}>
        <div className={styles.hospitalMapHeader}>
          <div className={styles.hospitalMapTitleRow}>
            <h3 className={styles.titleSm}>{t.analyze.mapPreviewTitle}</h3>
            <div className={styles.mapActionGroup}>
              {selectedMapHospital && mapStatus === "ready" && (
                <button type="button" className={styles.mapZoomButton} onClick={handleZoomSelectedHospital}>
                  <Eye className={styles.iconXs} aria-hidden="true" />
                  {t.analyze.mapZoomSelected}
                </button>
              )}
              {mapStatus === "ready" && (
                <button
                  ref={mapOpenButtonRef}
                  type="button"
                  className={styles.mapZoomButton}
                  onClick={handleOpenMapModal}
                >
                  <Maximize2 className={styles.iconXs} aria-hidden="true" />
                  {t.analyze.mapOpenLarge}
                </button>
              )}
            </div>
          </div>
          <p className={`${styles.mutedText} ${styles.hospitalMapDescription}`}>{t.analyze.mapPreviewDescription}</p>
        </div>
        <div
          ref={mapRef}
          className={styles.hospitalMapCanvas}
          aria-label={t.analyze.mapPreviewTitle}
        />
        {mapStatus === "error" && (
          <div className={styles.hospitalMapFallback} role="status">
            {t.analyze.mapPreviewUnavailable}
          </div>
        )}
      </article>
      {isMapModalOpen && (
        <HospitalMapModal
          hospitals={mapHospitals}
          selectedHospital={selectedMapHospital}
          onClose={() => setIsMapModalOpen(false)}
          onSelect={(hospital) => {
            onSelect(hospital)
            setIsMapModalOpen(false)
          }}
        />
      )}
    </>
  )
}

function HospitalMapModal({
  hospitals,
  selectedHospital,
  onClose,
  onSelect,
}: {
  hospitals: HospitalItem[]
  selectedHospital: HospitalItem | null
  onClose: () => void
  onSelect: (hospital: HospitalItem) => void
}) {
  const { t } = useLanguage()
  const modalRef = useRef<HTMLElement | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedMapHospital = selectedHospital && hasValidKoreaCoordinate(selectedHospital) ? selectedHospital : null
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab") return

      const modal = modalRef.current
      if (!modal) return

      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true")
      const firstElement = focusableElements[0] ?? modal
      const lastElement = focusableElements[focusableElements.length - 1] ?? modal
      const activeElement = document.activeElement

      if (!modal.contains(activeElement)) {
        event.preventDefault()
        firstElement.focus()
        return
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!mapKey || hospitals.length === 0 || !mapRef.current) return

    let isActive = true
    const initializeMap = () => {
      const kakaoMaps = (window as KakaoMapsWindow).kakao?.maps
      if (!isActive || !kakaoMaps || !mapRef.current) return

      const focusedHospital = selectedMapHospital ?? hospitals[0]
      const focusedCoordinate = getHospitalCoordinate(focusedHospital)
      const center = new kakaoMaps.LatLng(focusedCoordinate.latitude ?? 37.5665, focusedCoordinate.longitude ?? 126.978)
      mapRef.current.replaceChildren()
      const map = new kakaoMaps.Map(mapRef.current, { center, level: selectedMapHospital ? 3 : 5 })
      mapInstanceRef.current = map
      const bounds = new kakaoMaps.LatLngBounds()

      hospitals.forEach((hospital) => {
        const { latitude, longitude } = getHospitalCoordinate(hospital)
        const position = new kakaoMaps.LatLng(latitude, longitude)
        bounds.extend(position)
        const marker = new kakaoMaps.Marker({ position, map })
        kakaoMaps.event.addListener(marker, "click", () => onSelectRef.current(hospital))
      })

      const fitMap = () => {
        if (!isActive) return
        map.relayout()
        if (selectedMapHospital) {
          const { latitude, longitude } = getHospitalCoordinate(selectedMapHospital)
          map.setCenter(new kakaoMaps.LatLng(latitude, longitude))
          map.setLevel(3)
          return
        }
        if (hospitals.length > 1) map.setBounds(bounds)
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(fitMap, 120)
      })
    }

    const loadKakaoMap = () => {
      ;(window as KakaoMapsWindow).kakao?.maps?.load(initializeMap)
    }
    const handleScriptError = () => {
      if (mapRef.current) mapRef.current.replaceChildren()
    }
    const existingScript = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null
    if (existingScript) {
      if ((window as KakaoMapsWindow).kakao?.maps) {
        loadKakaoMap()
      } else {
        existingScript.addEventListener("load", loadKakaoMap, { once: true })
        existingScript.addEventListener("error", handleScriptError, { once: true })
      }
      return () => {
        isActive = false
        mapInstanceRef.current = null
        existingScript.removeEventListener("load", loadKakaoMap)
        existingScript.removeEventListener("error", handleScriptError)
      }
    }

    const script = document.createElement("script")
    script.id = "kakao-map-sdk"
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${mapKey}&autoload=false`
    script.onload = loadKakaoMap
    script.onerror = handleScriptError
    document.head.appendChild(script)

    return () => {
      isActive = false
      mapInstanceRef.current = null
      script.onload = null
      script.onerror = null
    }
  }, [hospitals, mapKey, selectedMapHospital])

  return (
    <div className={styles.mapModalBackdrop} role="presentation" onClick={onClose}>
      <section
        ref={modalRef}
        className={styles.mapModalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hospital-map-modal-title"
        aria-describedby="hospital-map-modal-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.mapModalHeader}>
          <div>
            <h2 id="hospital-map-modal-title" className={styles.regionSheetTitle}>{t.analyze.mapLargeTitle}</h2>
            <p id="hospital-map-modal-description">{t.analyze.mapLargeDescription}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.regionSheetCloseButton}
            aria-label={t.analyze.mapCloseLarge}
            onClick={onClose}
          >
            <X className={styles.iconMd} aria-hidden="true" />
          </button>
        </div>
        <div ref={mapRef} className={styles.hospitalMapModalCanvas} aria-label={t.analyze.mapLargeTitle} />
      </section>
    </div>
  )
}

function HospitalResultCard({
  hospital,
  regionLabel,
  onSelect,
}: {
  hospital: HospitalItem
  regionLabel: string
  onSelect: () => void
}) {
  const { t, language } = useLanguage()
  const sourceName = hospital.sourceName?.toLowerCase() ?? ""
  const providerName = String(hospital.provider ?? "").toLowerCase()
  const isNaverSource = sourceName.includes("naver") || sourceName.includes("네이버") || providerName.includes("naver")
  const naverPlaceHref = buildNaverPlaceHref(hospital, isNaverSource)
  const categoryLabel =
    language === "en"
      ? hospital.categoryEnLabel || t.categories[hospital.category]
      : hospital.categoryKoLabel || t.categories[hospital.category]
  const displayName = getHospitalCardName(hospital, language, categoryLabel)
  const displayRegionLabel = getHospitalCardRegionLabel(hospital, regionLabel, language)
  const displayAddress = getHospitalCardAddressLabel(hospital)

  return (
    <article className={`${styles.recordButton} ${styles.hospitalResultCard}`}>
      <FavoriteHospitalButton hospital={hospital} initialFavorite={hospital.isFavorite} favoriteHospitalId={hospital.favoriteHospitalId} iconOnly className={styles.favoriteSearchToggle} />
      <span className={`${styles.iconBoxSmall} ${styles.iconPink}`}>
        <MapPinned className={styles.iconSm} />
      </span>
      <div className={styles.recordBody}>
        <strong className={styles.recordName}>{displayName}</strong>
        <p className={styles.recordDate}>
          {categoryLabel} · {displayRegionLabel}
        </p>
        {displayAddress && <p className={styles.recordMeta}>{displayAddress}</p>}
        <div className={styles.badgeRow}>
          {hospital.isOfficialHospital && (
            <span className={styles.officialPill}>
              {t.analyze.officialHospitalBadge}
            </span>
          )}
          {typeof hospital.reviewCount === "number" && hospital.reviewCount > 0 && (
            <span className={styles.neutralPill}>
              {t.analyze.reviewCount} {hospital.reviewCount}
            </span>
          )}
          {hospital.sourceName && (
            <span className={styles.neutralPill}>
              {t.analyze.source} {hospital.sourceName}
            </span>
          )}
        </div>
        <div className={styles.linkRow}>
          {hospital.sourceUrl && !isSameHref(hospital.sourceUrl, naverPlaceHref) && (
            <SourceLink href={hospital.sourceUrl} label={t.analyze.sourceLink} />
          )}
          {naverPlaceHref && <SourceLink href={naverPlaceHref} label={t.analyze.naverOriginalLink} />}
          {hospital.mapUrl && !isSameHref(hospital.mapUrl, naverPlaceHref) && <SourceLink href={hospital.mapUrl} label={t.analyze.map} />}
          {hospital.homepageUrl && <SourceLink href={hospital.homepageUrl} label={t.analyze.homepage} />}
        </div>
        <div className={styles.hospitalCardActions}>
          {isInternalHospitalId(hospital.id) ? (
            <Link className={styles.secondaryButton} href={`${ROUTES.HOSPITAL_DETAIL}/${hospital.id}`}>
              {t.hospital.detail}
            </Link>
          ) : hospital.mapUrl ? (
            <a className={styles.secondaryButton} href={hospital.mapUrl} target="_blank" rel="noreferrer">
              {isSameHref(hospital.mapUrl, naverPlaceHref) ? t.analyze.naverOriginalLink : t.analyze.viewOnMap}
            </a>
          ) : (
            <span className={styles.secondaryButtonDisabled}>{t.analyze.viewOnMap}</span>
          )}
          <button type="button" className={styles.hospitalSelectButton} onClick={onSelect}>
            {t.analyze.selectHospital}
          </button>
        </div>
      </div>
    </article>
  )
}

function ReviewCard({
  review,
  checked,
  onToggle,
}: {
  review: HospitalReviewItem
  checked: boolean
  onToggle: () => void
}) {
  const { t } = useLanguage()

  return (
    <article className={`${styles.reviewCard} ${checked ? styles.selectedReviewCard : ""}`}>
      <label className={styles.reviewCheckRow}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className={styles.recordBody}>
          <span className={styles.reviewMetaLine}>
            {review.rating && (
              <span>
                <Star className={styles.iconXs} /> {review.rating}/5
              </span>
            )}
            {review.createdAt && <span>{review.createdAt}</span>}
            {review.sourceName && <span>{review.sourceName}</span>}
          </span>
          <span className={styles.reviewContent}>{review.content}</span>
        </span>
      </label>
      <div className={styles.badgeRow}>
        <span className={styles.statusBadge}>{`${t.analyze.trustSignal}: ${levelLabel(t, review.trustSignal)}`}</span>
        <span className={styles.statusBadge}>{`${t.analyze.adSuspicion}: ${levelLabel(t, review.adSuspicion)}`}</span>
        {review.adSuspicion !== "low" && <span className={styles.statusBadge}>{t.analyze.needsReview}</span>}
      </div>
      {review.sourceUrl && (
        <div className={styles.linkRow}>
          <SourceLink href={review.sourceUrl} label={t.analyze.viewSource} />
        </div>
      )}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function PhraseList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className={styles.stackSm}>
      <h3 className={styles.titleSm}>{title}</h3>
      <div className={styles.badgeRow}>
        {items.map((item) => (
          <span key={item} className={styles.neutralPill}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  const { t } = useLanguage()

  if (totalPages <= 1) return null

  return (
    <div className={styles.paginationControls}>
      <button type="button" className={styles.pageButton} onClick={onPrev} disabled={currentPage === 0}>
        <span aria-hidden="true">&lt;</span>
        {t.analyze.previous}
      </button>
      <span className={styles.pageIndicator}>
        {currentPage + 1}/{totalPages}
      </span>
      <button type="button" className={styles.pageButton} onClick={onNext} disabled={currentPage >= totalPages - 1}>
        {t.analyze.next}
        <span aria-hidden="true">&gt;</span>
      </button>
    </div>
  )
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a className={styles.sourceLink} href={href} target="_blank" rel="noreferrer">
      <LinkIcon className={styles.iconXs} />
      {label}
      <ExternalLink className={styles.iconXs} />
    </a>
  )
}
