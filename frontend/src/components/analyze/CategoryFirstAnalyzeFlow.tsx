"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  FileCheck2,
  LinkIcon,
  LoaderCircle,
  MapPinned,
  Pencil,
  Search,
  Smile,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
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
import { analysisHistoryService } from "@/services/analysisHistoryService"
import { hospitalSearchService } from "@/services/hospitalSearchService"
import { reviewAnalysisService } from "@/services/reviewAnalysisService"
import { ApiClientError } from "@/services/apiClient"
import styles from "@/styles/App.module.css"

type AccessibilityBooleanField = "hasEnglishInfo" | "hasEnglishReviews" | "hasGooglePhotos" | "hasPhotos"

type SelectedAnalyzeRegion = {
  provinceCode: RegionProvinceCode
  districtCode: string
}

type DistrictSearchResult = {
  province: RegionProvince
  district: RegionDistrict
}

type AnalyzeCategoryFilter = HospitalCategory | null

type AccessibilityEnhancementInput = {
  googleMapUrl: string
  homepageUrl: string
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

const categoryToHistoryName: Record<HospitalCategory, "skin" | "eye" | "dental"> = {
  derma: "skin",
  eye: "eye",
  dental: "dental",
}

const categoryKeywordMatchers: Record<HospitalCategory, string[]> = {
  derma: ["피부", "피부과", "derma", "skin"],
  eye: ["안과", "라식", "라섹", "백내장", "드림렌즈", "eye", "ophthalmology"],
  dental: ["치과", "교정", "임플란트", "스케일링", "dental", "dentist"],
}

const REVIEW_EXAMPLE_CATEGORIES: ReviewExampleCategory[] = ["kindness", "waiting", "cost", "consultation", "aftercare"]
const PAGE_SIZE = 3
const MIN_REVIEW_TEXT_LENGTH = 20
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
  if (normalizedValue === "derma" || normalizedValue === "eye" || normalizedValue === "dental") {
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
  const normalizedRegionLabel = normalizeHospitalSearchText(regionLabel)
  const normalizedAddress = normalizeHospitalSearchText(hospital.address)
  const normalizedManualRegion = normalizeHospitalSearchText(hospital.manualRegionLabel)
  const provinceCode = region.provinceCode.toLowerCase()

  return (
    hospital.region === provinceCode ||
    Boolean(normalizedRegionLabel && normalizedAddress.includes(normalizedRegionLabel)) ||
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
  return content
    .replace(/[.,!?~。！？]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function getReviewDraftStatus(content: string, duplicateCount: number): ReviewDraftStatus {
  if (content.trim().length < MIN_REVIEW_TEXT_LENGTH) return "short"
  if (duplicateCount > 1) return "duplicate"
  return "ready"
}

function normalizeReviewDrafts(drafts: ReviewDraft[]) {
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

function splitReviewText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return []

  const paragraphParts = trimmed
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (paragraphParts.length > 1) return paragraphParts

  return trimmed
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
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

function requestScreenshotOcrExtraction() {
  // TODO: Connect this to the OCR backend when image text extraction is available.
  return null
}

function mergeReviewDraftsForAnalysis(drafts: ReviewDraft[]) {
  return drafts.map((draft, index) => `[리뷰 ${index + 1}]\n${draft.content.trim()}`).join("\n\n")
}

function isInternalHospitalId(id: string) {
  return /^\d+$/.test(id)
}

function buildHospitalMetadataPayload(hospital?: HospitalItem) {
  if (!hospital) return {}

  const sourceName = hospital.sourceName?.toLowerCase() ?? ""
  const sourceUrl = hospital.sourceUrl ?? ""
  const isNaverSource = sourceName.includes("naver") || sourceName.includes("네이버")
  const englishName = hospital.hospitalEnglishName || hospital.hospitalNameEn

  return {
    address: hospital.address,
    roadAddress: hospital.roadAddress,
    phone: hospital.phone,
    treatmentItems: splitTreatmentItems(hospital.treatmentItems),
    description: hospital.description,
    hasPhotos: Boolean(hospital.imageUrl),
    homepageUrl: hospital.homepageUrl,
    sourceProvider: hospital.provider,
    externalPlaceId: hospital.externalPlaceId,
    kakaoPlaceUrl: hospital.kakaoPlaceUrl,
    naverPlaceUrl: isNaverSource ? sourceUrl : undefined,
    googleMapUrl: hospital.mapUrl,
    latitude: hospital.latitude ?? hospital.lat,
    longitude: hospital.longitude ?? hospital.lng,
    googleRegistered: Boolean(hospital.mapUrl),
    englishName,
    hasEnglishInfo: Boolean(englishName),
    hasEnglishReviews: false,
    hasGooglePhotos: Boolean(hospital.imageUrl),
  }
}

function textOverride(value: string, fallback?: string) {
  return value.trim() || fallback
}

function booleanOverride(value: boolean | null, fallback?: boolean) {
  return value ?? Boolean(fallback)
}

function buildAccessibilityMetadataPayload(
  hospital: HospitalItem | undefined,
  input: AccessibilityEnhancementInput
): Pick<
  ReviewAnalyzeRequest,
  "googleMapUrl" | "homepageUrl" | "englishName" | "hasEnglishInfo" | "hasEnglishReviews" | "hasGooglePhotos" | "hasPhotos"
> {
  const fallback = buildHospitalMetadataPayload(hospital)

  return {
    googleMapUrl: textOverride(input.googleMapUrl, fallback.googleMapUrl),
    homepageUrl: textOverride(input.homepageUrl, fallback.homepageUrl),
    englishName: textOverride(input.englishName, fallback.englishName),
    hasEnglishInfo: booleanOverride(input.hasEnglishInfo, fallback.hasEnglishInfo),
    hasEnglishReviews: booleanOverride(input.hasEnglishReviews, fallback.hasEnglishReviews),
    hasGooglePhotos: booleanOverride(input.hasGooglePhotos, fallback.hasGooglePhotos),
    hasPhotos: booleanOverride(input.hasPhotos, fallback.hasPhotos),
  }
}

function toHospitalRegionCode(region?: SelectedAnalyzeRegion | null): HospitalRegionCode | undefined {
  return region ? (region.provinceCode.toLowerCase() as HospitalRegionCode) : undefined
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
  return {
    id: `manual-${Date.now()}`,
    name: keyword,
    hospitalNameKo: keyword,
    category,
    region: region ?? "seoul",
    address: regionLabel,
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
  response,
  userId,
  selectedReviewCount,
  totalReviewCount,
}: {
  hospital?: HospitalItem
  hospitalName: string
  category: HospitalCategory
  response: ReviewAnalyzeResponse
  userId?: string | number
  selectedReviewCount: number
  totalReviewCount: number
}): ApiAnalysisResult {
  const globalAccessibilityScore =
    response.globalAccessibilityScore ??
    response.foreignerScore ??
    (hospital ? [hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl, hospital.phone].filter(Boolean).length : 0)
  const foreignAccessibilityStars = toFiveStarScore(
    globalAccessibilityScore,
    response.globalAccessibilityMaxScore
  )

  return {
    id: `analysis-${Date.now()}`,
    analysisRequestId: response.analysisRequestId,
    analysisResultId: response.analysisResultId,
    hospitalId: response.hospitalId,
    reviewIds: response.reviewIds,
    userId,
    hospitalName,
    hospitalNameKo: hospital?.hospitalNameKo,
    hospitalNameEn: hospital?.hospitalNameEn,
    hospitalEnglishName: hospital?.hospitalEnglishName,
    category,
    hospitalCategory: categoryToHistoryName[category],
    hospitalAddress: hospital?.address,
    region: hospital?.region,
    sourceName: hospital?.sourceName,
    sourceUrl: hospital?.sourceUrl,
    score: response.totalScore,
    foreignerFriendlyScore: globalAccessibilityScore,
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    selectedReviewCount,
    totalReviewCount,
    trustScore: response.trustScore,
    trustLevel: response.trustLevelKey,
    trustGrade: response.trustGrade,
    trustLevelKey: response.trustLevelKey,
    adSuspicion: response.adSuspicion,
    adSuspicionScore: response.adSuspicionScore,
    adSuspicionLevel: response.adSuspicionLevel,
    repetitivePatternLevel: response.repetitivePhrases.length > 0 ? signalLevelFromValue(response.adSuspicionLevel) : "low",
    concreteExperienceLevel: concreteExperienceLevel(response.informationLevel),
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
  const [screenshotFileNames, setScreenshotFileNames] = useState<string[]>([])
  const [uploadedReviewFileName, setUploadedReviewFileName] = useState("")
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
  const initialSearchAppliedRef = useRef(false)

  const reviews = useMemo(() => (selectedHospital ? getDemoReviewsForHospital(selectedHospital) : []), [selectedHospital])
  const selectedReviews = reviews.filter((review) => selectedReviewIds.includes(review.id))
  const hospitals = results
  const reviewTotalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const visibleReviews = reviews.slice(reviewPage * PAGE_SIZE, reviewPage * PAGE_SIZE + PAGE_SIZE)
  const reviewInboxSummary = useMemo(() => {
    const shortCount = reviewDrafts.filter((review) => review.status === "short").length
    const duplicateCount = reviewDrafts.filter((review) => review.status === "duplicate").length
    const readyCount = reviewDrafts.filter((review) => review.included && review.status === "ready").length

    return {
      totalCount: reviewDrafts.length,
      shortCount,
      duplicateCount,
      readyCount,
    }
  }, [reviewDrafts])
  const isReviewAnalysisDisabled = isAnalyzing || reviewInboxSummary.totalCount === 0 || reviewInboxSummary.readyCount <= 0
  const analysisReadyReviewDrafts = useMemo(
    () => reviewDrafts.filter((review) => review.included && review.status === "ready" && review.content.trim()),
    [reviewDrafts]
  )
  const selectedHospitalMetadata = useMemo(
    () => buildHospitalMetadataPayload(selectedHospital ?? undefined),
    [selectedHospital]
  )
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
    { key: "dental" as const, label: t.categories.dental, desc: t.categories.dentalDesc, icon: Smile },
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

  const handleAccessibilityTextChange = (
    field: "googleMapUrl" | "homepageUrl" | "englishName",
    value: string
  ) => {
    setAccessibilityInput((current) => ({ ...current, [field]: value }))
  }

  const handleAccessibilityBooleanChange = (field: AccessibilityBooleanField, value: boolean) => {
    setAccessibilityInput((current) => ({ ...current, [field]: value }))
  }

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
    setScreenshotFileNames(supportedFiles.map((file) => file.name))

    if (files.length > supportedFiles.length) {
      setReviewFeedback(t.analyze.reviewInbox.importUnsupportedFeedback)
      return
    }

    if (supportedFiles.length > 0) {
      setReviewFeedback(t.analyze.reviewInbox.screenshotSelectedFeedback.replace("{count}", String(supportedFiles.length)))
    }
  }

  const handleReadScreenshotReviews = () => {
    requestScreenshotOcrExtraction()
    setReviewFeedback(
      screenshotFileNames.length > 0
        ? t.analyze.reviewInbox.ocrPendingFeedback
        : t.analyze.reviewInbox.screenshotRequiredFeedback
    )
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

  const handleOpenReviews = useCallback((hospital: HospitalItem) => {
    const nextReviews = getDemoReviewsForHospital(hospital)
    setSelectedHospital(hospital)
    setDirectHospitalName(hospital.name)
    setSelectedReviewIds(nextReviews.map((review) => review.id))
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
  }, [])

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
    selectedReviewCount,
    totalReviewCount,
  }: {
    hospital?: HospitalItem
    hospitalName: string
    reviewText?: string
    reviews?: string[]
    selectedReviewCount: number
    totalReviewCount: number
  }) => {
    if (requireLoginForAnalysis()) return

    setIsAnalyzing(true)
    setAnalyzeError("")
    setInputError("")
    setAnalysisResult(null)
    setIsSaved(false)

    try {
      const resultCategory = hospital?.category ?? effectiveSearchCategory ?? "derma"
      const response = await reviewAnalysisService.analyzeReview({
        category: resultCategory,
        hospitalName,
        reviewText,
        reviews: targetReviewTexts,
        outputLanguage: language,
        region: selectedRegionLabel || undefined,
        ...buildHospitalMetadataPayload(hospital),
        ...buildAccessibilityMetadataPayload(hospital, accessibilityInput),
      })

      const nextAnalysisResult = createApiAnalysisResult({
        hospital,
        hospitalName,
        category: resultCategory,
        response,
        userId,
        selectedReviewCount,
        totalReviewCount,
      })

      setAnalysisResult(nextAnalysisResult)
      writeCurrentReviewAnalysis({
        ...response,
        id: nextAnalysisResult.id,
        category: resultCategory,
        hospitalName,
        hospitalNameKo: hospital?.hospitalNameKo,
        hospitalNameEn: hospital?.hospitalNameEn,
        hospitalEnglishName: hospital?.hospitalEnglishName,
        reviewText: reviewText ?? targetReviewTexts?.join("\n\n"),
        analyzedAt: nextAnalysisResult.analyzedAt ?? new Date().toISOString(),
      })
      router.push(ROUTES.RESULT)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        requireLoginForAnalysis(true)
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
    if (reviewInboxSummary.totalCount === 0 || reviewInboxSummary.readyCount <= 0) {
      setInputError(t.analyze.reviewInboxRequired)
      setAnalyzeError("")
      return
    }
    if (!hospitalName) {
      setInputError(t.analyze.hospitalInfoRequired)
      setAnalyzeError("")
      return
    }

    const targetReviews = analysisReadyReviewDrafts.map((review) => review.content.trim())
    await analyzeWithApi({
      hospitalName,
      reviewText: mergeReviewDraftsForAnalysis(analysisReadyReviewDrafts),
      reviews: targetReviews,
      selectedReviewCount: targetReviews.length,
      totalReviewCount: reviewDrafts.length,
    })
  }

  const handleAnalyzeHospitalReviews = async (hospital: HospitalItem, targetReviews: HospitalReviewItem[]) => {
    if (targetReviews.length === 0) return

    setSelectedHospital(hospital)
    await analyzeWithApi({
      hospital,
      hospitalName: hospital.name,
      reviews: targetReviews.map((review) => review.content),
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

  const selectedHospitalReviewSection = selectedHospital ? (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.reviewListTitle}</h2>
          <p className={styles.bodyText}>
            {selectedHospital.name} · {selectedHospitalRegionLabel}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <article className={styles.emptyCard}>
          <h3 className={styles.titleMd}>{t.analyze.noReviews}</h3>
        </article>
      ) : (
        <>
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
        </>
      )}
    </section>
  ) : null

  const reviewImportSection = selectedHospital ? (
    <section className={`${styles.card} ${styles.stackSm}`}>
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
        screenshotFileNames={screenshotFileNames}
        uploadedReviewFileName={uploadedReviewFileName}
        onChange={setDirectReviewText}
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

  const analyzeGuideSection = selectedHospital ? (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <p className={styles.memberEyebrow}>ANALYZE GUIDE</p>
      <h2 className={styles.titleMd}>{t.about.howTitle}</h2>
      <ol className={styles.compactList}>
        {t.about.steps.map((step: string) => <li key={step}>{step}</li>)}
      </ol>
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
          <strong>{hasSearched ? t.analyze.searchTipTitle : t.analyze.usageTipTitle}</strong>
          <p>{hasSearched ? t.analyze.searchTipDescription : t.analyze.usageTipDescription}</p>
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

      {selectedHospital && (
        <AccuracyEnhancementSection
          input={accessibilityInput}
          fallback={selectedHospitalMetadata}
          onTextChange={handleAccessibilityTextChange}
          onBooleanChange={handleAccessibilityBooleanChange}
        />
      )}

      {reviewImportSection}

      {analyzeGuideSection}

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
  screenshotFileNames,
  uploadedReviewFileName,
  onChange,
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
  screenshotFileNames: string[]
  uploadedReviewFileName: string
  onChange: (value: string) => void
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

      {(screenshotFileNames.length > 0 || uploadedReviewFileName) && (
        <div className={styles.fileNameList}>
          {screenshotFileNames.map((fileName) => (
            <span key={fileName}>{fileName}</span>
          ))}
          {uploadedReviewFileName && <span>{uploadedReviewFileName}</span>}
        </div>
      )}

      {screenshotFileNames.length > 0 && (
        <button type="button" className={styles.reviewImportTextButton} disabled onClick={onReadScreenshotReviews}>
          {t.analyze.readScreenshotButton}
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
        <span className={styles.reviewDetectedText}>
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

      <ReviewStatusPanel
        reviews={reviews}
        summary={summary}
        feedback={feedback}
        onContentChange={onContentChange}
        onToggleIncluded={onToggleIncluded}
        onDelete={onDelete}
        onClear={onClear}
      />

      <section className={styles.reviewStartPanel}>
        <div>
          <h3 className={styles.titleSm}>{t.analyze.analysisStartTitle}</h3>
          <p className={styles.bodyText}>{t.analyze.analysisStartDescription}</p>
        </div>
        {inputError && <p className={styles.reviewFeedback}>{inputError}</p>}
        <button
          type="button"
          className={`${styles.primaryButton} ${styles.reviewAnalyzeButton}`}
          disabled={isAnalyzeDisabled}
          onClick={onStartAnalysis}
        >
          {isAnalyzing && <LoaderCircle className={`${styles.iconSm} ${styles.spin}`} />}
          {isAnalyzing ? t.analyze.submitting : t.analyze.directAnalyzeButton}
        </button>
      </section>
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
}: {
  reviews: ReviewDraft[]
  summary: { totalCount: number; shortCount: number; duplicateCount: number; readyCount: number }
  feedback: string
  onContentChange: (reviewId: string, content: string) => void
  onToggleIncluded: (reviewId: string) => void
  onDelete: (reviewId: string) => void
  onClear: () => void
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
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h3 className={styles.titleSm}>{t.analyze.reviewInbox.emptyTitle}</h3>
          <p className={styles.bodyText}>{t.analyze.reviewInbox.emptyDescription}</p>
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

function AccuracyEnhancementSection({
  input,
  fallback,
  onTextChange,
  onBooleanChange,
}: {
  input: AccessibilityEnhancementInput
  fallback: Partial<ReviewAnalyzeRequest>
  onTextChange: (field: "googleMapUrl" | "homepageUrl" | "englishName", value: string) => void
  onBooleanChange: (field: AccessibilityBooleanField, value: boolean) => void
}) {
  const { t } = useLanguage()
  const resolvedBoolean = (field: AccessibilityBooleanField) => input[field] ?? Boolean(fallback[field])

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div>
        <h2 className={styles.titleMd}>{t.analyze.accuracyEnhancementTitle}</h2>
        <p className={styles.bodyText}>{t.analyze.accuracyEnhancementDescription}</p>
      </div>

      <details className={`${styles.softCard} ${styles.accessibilityDetails} ${styles.stackSm}`}>
        <summary className={`${styles.titleSm} ${styles.accessibilitySummary}`}>
          {t.analyze.locationReservationAccordionTitle}
        </summary>
        <p className={styles.bodyText}>{t.analyze.locationReservationAccordionDescription}</p>
        <label className={styles.label} htmlFor="hospital-map-url">
          {t.analyze.hospitalMapLinkLabel}
          <input
            id="hospital-map-url"
            className={styles.input}
            type="url"
            placeholder={fallback.googleMapUrl || t.analyze.mapUrlPlaceholder}
            value={input.googleMapUrl}
            onChange={(event) => onTextChange("googleMapUrl", event.target.value)}
          />
        </label>
        <label className={styles.label} htmlFor="hospital-homepage-url">
          {t.analyze.hospitalHomepageLinkLabel}
          <input
            id="hospital-homepage-url"
            className={styles.input}
            type="url"
            placeholder={fallback.homepageUrl || t.analyze.homepageUrlPlaceholder}
            value={input.homepageUrl}
            onChange={(event) => onTextChange("homepageUrl", event.target.value)}
          />
        </label>
      </details>

      <details className={`${styles.softCard} ${styles.accessibilityDetails} ${styles.stackSm}`}>
        <summary className={`${styles.titleSm} ${styles.accessibilitySummary}`}>
          {t.analyze.languageInfoAccordionTitle}
        </summary>
        <p className={styles.bodyText}>{t.analyze.languageInfoAccordionDescription}</p>
        <label className={styles.label} htmlFor="access-english-name">
          {t.analyze.englishNameLabel}
          <input
            id="access-english-name"
            className={styles.input}
            type="text"
            placeholder={fallback.englishName || t.analyze.englishNamePlaceholder}
            value={input.englishName}
            onChange={(event) => onTextChange("englishName", event.target.value)}
          />
        </label>
        <div className={`${styles.stackSm} ${styles.languageCheckGroup}`}>
          <label className={styles.reviewCheckRow}>
            <input
              type="checkbox"
              checked={resolvedBoolean("hasEnglishInfo")}
              onChange={(event) => onBooleanChange("hasEnglishInfo", event.target.checked)}
            />
            <span>{t.analyze.hasEnglishInfoLabel}</span>
          </label>
          <label className={styles.reviewCheckRow}>
            <input
              type="checkbox"
              checked={resolvedBoolean("hasEnglishReviews")}
              onChange={(event) => onBooleanChange("hasEnglishReviews", event.target.checked)}
            />
            <span>{t.analyze.hasEnglishReviewsLabel}</span>
          </label>
        </div>
      </details>

      <details className={`${styles.softCard} ${styles.accessibilityDetails} ${styles.stackSm}`}>
        <summary className={`${styles.titleSm} ${styles.accessibilitySummary}`}>
          {t.analyze.visitReferenceAccordionTitle}
        </summary>
        <p className={styles.bodyText}>{t.analyze.visitReferenceAccordionDescription}</p>
        <label className={styles.reviewCheckRow}>
          <input
            type="checkbox"
            checked={resolvedBoolean("hasPhotos")}
            onChange={(event) => onBooleanChange("hasPhotos", event.target.checked)}
          />
          <span>{t.analyze.hasPhotosLabel}</span>
        </label>
      </details>
    </section>
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
  const onSelectRef = useRef(onSelect)
  const [mapStatus, setMapStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
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

  const handleZoomSelectedHospital = () => {
    if (!selectedMapHospital) return
    focusHospitalOnMap(selectedMapHospital)
  }

  if (!mapKey || mapHospitals.length === 0) return null

  return (
    <article className={`${styles.card} ${styles.hospitalMapPanel}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.titleSm}>{t.analyze.mapPreviewTitle}</h3>
          <p className={styles.mutedText}>{t.analyze.mapPreviewDescription}</p>
        </div>
        {selectedMapHospital && mapStatus === "ready" && (
          <button type="button" className={styles.mapZoomButton} onClick={handleZoomSelectedHospital}>
            <Eye className={styles.iconXs} aria-hidden="true" />
            {t.analyze.mapZoomSelected}
          </button>
        )}
      </div>
      <div ref={mapRef} className={styles.hospitalMapCanvas} aria-label={t.analyze.mapPreviewTitle} />
      {mapStatus === "error" && (
        <div className={styles.hospitalMapFallback} role="status">
          {t.analyze.mapPreviewUnavailable}
        </div>
      )}
    </article>
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

  return (
    <article className={`${styles.recordButton} ${styles.hospitalResultCard}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconPink}`}>
        <MapPinned className={styles.iconSm} />
      </span>
      <div className={styles.recordBody}>
        <strong className={styles.recordName}>{getHospitalDisplayName(hospital, language)}</strong>
        <p className={styles.recordDate}>
          {t.categories[hospital.category]} · {regionLabel}
        </p>
        <p className={styles.recordMeta}>{hospital.address}</p>
        <div className={styles.badgeRow}>
          {hospital.isOfficialHospital && (
            <span className={styles.officialPill}>
              {t.analyze.officialHospitalBadge}
            </span>
          )}
          <span className={styles.neutralPill}>
            {t.analyze.reviewCount} {hospital.reviewCount ?? 0}
          </span>
          {hospital.sourceName && (
            <span className={styles.neutralPill}>
              {t.analyze.source} {hospital.sourceName}
            </span>
          )}
        </div>
        <div className={styles.linkRow}>
          {hospital.sourceUrl && <SourceLink href={hospital.sourceUrl} label={t.analyze.sourceLink} />}
          {hospital.mapUrl && <SourceLink href={hospital.mapUrl} label={t.analyze.map} />}
          {hospital.homepageUrl && <SourceLink href={hospital.homepageUrl} label={t.analyze.homepage} />}
        </div>
        <div className={styles.hospitalCardActions}>
          {isInternalHospitalId(hospital.id) ? (
            <Link className={styles.secondaryButton} href={`${ROUTES.HOSPITAL_DETAIL}/${hospital.id}`}>
              {t.hospital.detail}
            </Link>
          ) : hospital.mapUrl ? (
            <a className={styles.secondaryButton} href={hospital.mapUrl} target="_blank" rel="noreferrer">
              {t.analyze.viewOnMap}
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
