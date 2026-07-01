"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  ExternalLink,
  FileCheck2,
  FileText,
  LinkIcon,
  LoaderCircle,
  MapPinned,
  Pencil,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
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

type ReviewExampleCategory = "kindness" | "waiting" | "cost" | "consultation" | "aftercare"

const categoryToHistoryName: Record<HospitalCategory, "skin" | "eye" | "dental"> = {
  derma: "skin",
  eye: "eye",
  dental: "dental",
}

const REVIEW_EXAMPLE_CATEGORIES: ReviewExampleCategory[] = ["kindness", "waiting", "cost", "consultation", "aftercare"]
const PAGE_SIZE = 3
const MIN_REVIEW_TEXT_LENGTH = 20
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
  return trustLevelKey ? t.trustLevels[trustLevelKey] : t.trustLevels.high
}

function levelLabel(t: ReturnType<typeof useLanguage>["t"], level?: string) {
  if (level === "high") return t.analyze.high
  if (level === "medium") return t.analyze.medium
  if (level === "low") return t.analyze.low
  return t.analyze.caution
}

function formatStars(rating = 0) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)))
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`
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
  return content.replace(/\s+/g, " ").trim().toLowerCase()
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

function buildHospitalMetadataPayload(hospital?: HospitalItem) {
  if (!hospital) return {}

  const sourceName = hospital.sourceName?.toLowerCase() ?? ""
  const sourceUrl = hospital.sourceUrl ?? ""
  const isNaverSource = sourceName.includes("naver") || sourceName.includes("네이버")
  const englishName = hospital.hospitalEnglishName || hospital.hospitalNameEn

  return {
    address: hospital.address,
    phone: hospital.phone,
    treatmentItems: splitTreatmentItems(hospital.treatmentItems),
    description: hospital.description,
    hasPhotos: Boolean(hospital.imageUrl),
    homepageUrl: hospital.homepageUrl,
    naverPlaceUrl: isNaverSource ? sourceUrl : undefined,
    googleMapUrl: hospital.mapUrl,
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

function readInitialAnalyzeRegion(): SelectedAnalyzeRegion | null {
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
  const foreignAccessibilityStars =
    response.globalAccessibilityScore ??
    (hospital ? [hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl, hospital.phone].filter(Boolean).length : 0)

  return {
    id: `analysis-${Date.now()}`,
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
    foreignerFriendlyScore: response.foreignerScore,
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    selectedReviewCount,
    totalReviewCount,
    trustScore: response.trustScore,
    trustLevel: response.trustLevelKey,
    trustGrade: response.trustGrade,
    trustLevelKey: response.trustLevelKey,
    adSuspicion: response.adSuspicion,
    adSuspicionScore: response.adScore,
    adSuspicionLevel: response.adSuspicionLevel,
    repetitivePatternLevel: response.repetitivePhrases.length > 0 ? response.adSuspicionLevel : "low",
    concreteExperienceLevel: concreteExperienceLevel(response.informationLevel),
    summary: response.summary,
    suspiciousPhrases: response.suspiciousPhrases,
    repetitivePhrases: response.repetitivePhrases,
    detectedReasons: response.detectedPatterns,
    detectedPatterns: response.detectedPatterns,
    informationLevel: response.informationLevel,
    recommendation: response.recommendation,
    modelVersion: response.modelVersion,
    infoCompletenessScore: response.placeScore,
    globalAccessRating: foreignAccessibilityStars,
    foreignAccessibilityStars,
    reviewCount: selectedReviewCount,
    resultStatus: "completed",
  }
}

export function CategoryFirstAnalyzeFlow({ userId }: { userId?: string | number }) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const currentLanguage = language === "en" ? "en" : "ko"
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [selectedRegion, setSelectedRegion] = useState<SelectedAnalyzeRegion | null>(() => readInitialAnalyzeRegion())
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")
  const [modalProvinceCode, setModalProvinceCode] = useState<RegionProvinceCode | "">("")
  const [query, setQuery] = useState("")
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

  const reviews = useMemo(() => (selectedHospital ? getDemoReviewsForHospital(selectedHospital) : []), [selectedHospital])
  const selectedReviews = reviews.filter((review) => selectedReviewIds.includes(review.id))
  const hospitalTotalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const visibleHospitals = results.slice(hospitalPage * PAGE_SIZE, hospitalPage * PAGE_SIZE + PAGE_SIZE)
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

  const handleScreenshotFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setScreenshotFileNames(files.map((file) => file.name))
    if (files.length > 0) {
      setReviewFeedback(t.analyze.reviewInbox.screenshotSelectedFeedback.replace("{count}", String(files.length)))
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

  const handleReviewFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadedReviewFileName(file.name)

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".txt") && !fileName.endsWith(".csv")) {
      setReviewFeedback(t.analyze.reviewInbox.fileUnsupportedFeedback)
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

  const handleSearch = async (options: { withoutFilters?: boolean } = {}) => {
    const keyword = directHospitalKeyword
    const nextRegion = options.withoutFilters ? undefined : toHospitalRegionCode(selectedRegion)
    const nextCategory = options.withoutFilters ? undefined : category
    const nextRegionLabel = options.withoutFilters ? "" : selectedRegionSearchLabel

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
  }

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
    resetSearchState()
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
    resetSearchState()
  }

  const clearSelectedRegion = () => {
    setSelectedRegion(null)
    writeStoredAnalyzeRegion(null)
    resetSearchState()
  }

  const handleResetHospitalSearch = () => {
    setQuery("")
    setCategory("derma")
    setSelectedRegion(null)
    writeStoredAnalyzeRegion(null)
    resetSearchState()
  }

  const handleOpenReviews = (hospital: HospitalItem) => {
    const nextReviews = getDemoReviewsForHospital(hospital)
    setSelectedHospital(hospital)
    setDirectHospitalName(hospital.name)
    setSelectedReviewIds(nextReviews.map((review) => review.id))
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
  }

  const handleSelectManualHospital = () => {
    if (!directHospitalKeyword) return
    const manualHospital = createManualHospital({
      keyword: directHospitalKeyword,
      category,
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
    setIsAnalyzing(true)
    setAnalyzeError("")
    setInputError("")
    setAnalysisResult(null)
    setIsSaved(false)

    try {
      const response = await reviewAnalysisService.analyzeReview({
        category,
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
        category,
        response,
        userId,
        selectedReviewCount,
        totalReviewCount,
      })

      setAnalysisResult(nextAnalysisResult)
      writeCurrentReviewAnalysis({
        ...response,
        id: nextAnalysisResult.id,
        category,
        hospitalName,
        hospitalNameKo: hospital?.hospitalNameKo,
        hospitalNameEn: hospital?.hospitalNameEn,
        hospitalEnglishName: hospital?.hospitalEnglishName,
        reviewText: reviewText ?? targetReviewTexts?.join("\n\n"),
        analyzedAt: nextAnalysisResult.analyzedAt ?? new Date().toISOString(),
      })
      router.push(ROUTES.RESULT)
    } catch {
      setAnalyzeError(t.analyze.analyzeError)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyzeDirectReview = async () => {
    const hospitalName = directHospitalName.trim()
    if (isAnalyzing) return
    if (!hospitalName) {
      setInputError(t.analyze.hospitalInfoRequired)
      setAnalyzeError("")
      return
    }
    if (analysisReadyReviewDrafts.length === 0) {
      setInputError(t.analyze.reviewInboxRequired)
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

  return (
    <>
    <section className={styles.stackMd}>
      <section className={`${styles.card} ${styles.stackSm}`}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.hospitalFinderTitle}</h2>
          <p className={styles.bodyText}>{t.analyze.hospitalFinderDescription}</p>
        </div>
        <label className={styles.label} htmlFor="hospital-search">
          <span className={styles.mutedText}>{t.analyze.searchHelp}</span>
          <div className={styles.inlineField}>
            <input
              id="hospital-search"
              className={styles.input}
              type="search"
              placeholder={t.analyze.hospitalFinderPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSearch()
              }}
            />
            <button type="button" className={styles.smallPillButton} disabled={isHospitalSearching} onClick={() => void handleSearch()}>
              {isHospitalSearching ? <LoaderCircle className={`${styles.iconXs} ${styles.spin}`} /> : <Search className={styles.iconXs} />}
              {isHospitalSearching ? t.analyze.hospitalSearching : t.analyze.searchButton}
            </button>
          </div>
        </label>
        <div className={styles.historyActionGrid}>
          <button type="button" className={styles.secondaryButton} onClick={openRegionModal}>
            {selectedRegion ? t.analyze.changeRegionButton : t.analyze.selectRegionButton}
          </button>
          <span className={styles.filterLabelPill}>{t.analyze.medicalCategoryFilter}</span>
        </div>
        <CategorySelector selected={category} onSelect={handleCategoryChange} />
        <div className={styles.selectedFilterPanel}>
          <span className={styles.mutedText}>{t.analyze.selectedFilters}</span>
          <div className={styles.badgeRow}>
            {searchFiltersRelaxed ? (
              <span className={styles.neutralPill}>{t.analyze.filtersCleared}</span>
            ) : (
              <>
                {selectedRegion && <span className={styles.neutralPill}>{selectedRegionLabel}</span>}
                <span className={styles.neutralPill}>{t.categories[category]}</span>
              </>
            )}
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={handleResetHospitalSearch}
            >
              {t.analyze.resetFilters}
            </button>
          </div>
        </div>
      </section>

      {hasSearched && (
        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>
            {t.analyze.searchResultsCount.replace("{count}", String(results.length))}
          </h2>
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
          ) : results.length === 0 ? (
            <article className={`${styles.emptyCard} ${styles.stackSm}`}>
              <h3 className={styles.titleMd}>{t.analyze.noSearchResults}</h3>
              <p className={styles.bodyText}>{t.analyze.noSearchResultsDescription}</p>
              <p className={styles.mutedText}>{t.analyze.noSearchResultsFilterHint}</p>
              <div className={styles.hospitalFallbackActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!directHospitalKeyword}
                  onClick={() => void handleSearch({ withoutFilters: true })}
                >
                  {t.analyze.searchWithoutFilters}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!directHospitalKeyword}
                  onClick={handleSelectManualHospital}
                >
                  {directHospitalKeyword
                    ? t.analyze.selectHospitalNameDirectly.replace("{hospitalName}", directHospitalKeyword)
                    : t.analyze.selectEnteredHospitalDirectly}
                </button>
              </div>
            </article>
          ) : (
            <>
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
              {directHospitalKeyword && (
                <article className={`${styles.manualHospitalPrompt} ${styles.stackSm}`}>
                  <p className={styles.bodyText}>{t.analyze.cantFindHospital}</p>
                  <button type="button" className={styles.secondaryButton} onClick={handleSelectManualHospital}>
                    {t.analyze.selectEnteredHospitalDirectly}
                  </button>
                </article>
              )}
            </>
          )}
        </section>
      )}

      {selectedHospital && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.titleMd}>{t.analyze.selectedHospitalTitle}</h2>
              <p className={styles.bodyText}>
                {getHospitalDisplayName(selectedHospital, language)}
              </p>
            </div>
            <button type="button" className={styles.smallPillButton} onClick={handleFindAgain}>
              {t.analyze.findAgain}
            </button>
          </div>
          <div className={styles.selectedHospitalGrid}>
            {selectedHospitalRegionLabel && <span className={styles.neutralPill}>{selectedHospitalRegionLabel}</span>}
            <span className={styles.neutralPill}>{t.categories[selectedHospital.category]}</span>
          </div>
          {selectedHospital.isManual && <p className={styles.bodyText}>{t.analyze.manualHospitalNotice}</p>}
          {selectedHospital.address && <p className={styles.recordMeta}>{selectedHospital.address}</p>}
        </section>
      )}

      <AccuracyEnhancementSection
        input={accessibilityInput}
        fallback={selectedHospitalMetadata}
        onTextChange={handleAccessibilityTextChange}
        onBooleanChange={handleAccessibilityBooleanChange}
      />

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.reviewSourceTitle}</h2>
          <p className={styles.bodyText}>{t.analyze.reviewSourceDescription}</p>
        </div>
        <ReviewInputWorkspace
          value={directReviewText}
          screenshotFileNames={screenshotFileNames}
          uploadedReviewFileName={uploadedReviewFileName}
          onChange={setDirectReviewText}
          onAddReviews={handleAddManualReviews}
          onScreenshotFileChange={handleScreenshotFileChange}
          onReadScreenshotReviews={handleReadScreenshotReviews}
          onReviewFileChange={handleReviewFileChange}
        />
      </section>

      {selectedHospitalReviewSection}

      <ReviewInbox
        reviews={reviewDrafts}
        summary={reviewInboxSummary}
        feedback={reviewFeedback}
        onContentChange={handleReviewDraftContentChange}
        onToggleIncluded={handleToggleReviewDraft}
        onDelete={handleDeleteReviewDraft}
        onClear={handleClearReviewDrafts}
      />

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.directAnalyzeButton}</h2>
          <p className={styles.bodyText}>{t.analyze.analysisStartDescription}</p>
        </div>
        {inputError && <p className={styles.bodyText}>{inputError}</p>}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={isAnalyzing}
            onClick={handleAnalyzeDirectReview}
          >
            {isAnalyzing && <LoaderCircle className={`${styles.iconSm} ${styles.spin}`} />}
            {isAnalyzing ? t.analyze.submitting : t.analyze.directAnalyzeButton}
          </button>
        </div>
      </section>

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
            <Metric label={t.analyze.foreignAccessibility} value={formatStars(analysisResult.foreignAccessibilityStars)} />
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
    </>
  )
}

function ReviewInputWorkspace({
  value,
  screenshotFileNames,
  uploadedReviewFileName,
  onChange,
  onAddReviews,
  onScreenshotFileChange,
  onReadScreenshotReviews,
  onReviewFileChange,
}: {
  value: string
  screenshotFileNames: string[]
  uploadedReviewFileName: string
  onChange: (value: string) => void
  onAddReviews: () => void
  onScreenshotFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onReadScreenshotReviews: () => void
  onReviewFileChange: (event: ChangeEvent<HTMLInputElement>) => void
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
        <label className={styles.reviewImportButton} htmlFor="screenshot-review-files">
          <UploadCloud className={styles.iconXs} aria-hidden="true" />
          {t.analyze.importImageButton}
        </label>
        <input
          id="screenshot-review-files"
          className={styles.visuallyHidden}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/*"
          multiple
          onChange={onScreenshotFileChange}
        />
        <label className={styles.reviewImportButton} htmlFor="review-file-input">
          <FileText className={styles.iconXs} aria-hidden="true" />
          {t.analyze.importFileButton}
        </label>
        <input
          id="review-file-input"
          className={styles.visuallyHidden}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          onChange={onReviewFileChange}
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
        <button type="button" className={styles.reviewImportTextButton} onClick={onReadScreenshotReviews}>
          {t.analyze.readScreenshotButton}
        </button>
      )}

      <label className={styles.label} htmlFor="direct-review-text">
        <span className={styles.reviewInputLabel}>{t.analyze.reviewTextTitle}</span>
        <span className={styles.mutedText}>{t.analyze.manualImportDescription}</span>
        <textarea
          ref={textareaRef}
          id="direct-review-text"
          className={`${styles.textarea} ${styles.reviewPasteTextarea}`}
          placeholder={t.analyze.reviewPlaceholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

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
    </section>
  )
}

function ReviewInbox({
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

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.reviewInboxTitle}</h2>
          <p className={styles.bodyText}>{t.analyze.reviewInboxDescription}</p>
        </div>
        {reviews.length > 0 && (
          <button type="button" className={styles.smallPillButton} onClick={onClear}>
            {t.analyze.reviewInbox.clearAll}
          </button>
        )}
      </div>
      <div className={styles.reviewInboxSummaryGrid}>
        <Metric label={t.analyze.reviewInbox.totalCount} value={summary.totalCount} />
        <Metric label={t.analyze.reviewInbox.shortCount} value={summary.shortCount} />
        <Metric label={t.analyze.reviewInbox.duplicateCount} value={summary.duplicateCount} />
        <Metric label={t.analyze.reviewInbox.readyCount} value={summary.readyCount} />
      </div>
      {feedback && <p className={styles.reviewFeedback}>{feedback}</p>}
      {reviews.length === 0 ? (
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h3 className={styles.titleSm}>{t.analyze.reviewInbox.emptyTitle}</h3>
          <p className={styles.bodyText}>{t.analyze.reviewInbox.emptyDescription}</p>
        </article>
      ) : (
        <div className={styles.reviewDraftList}>
          {reviews.map((review, index) => (
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
        <div className={styles.stackSm}>
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
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <MapPinned className={styles.iconSm} />
      </span>
      <div className={styles.recordBody}>
        <strong className={styles.recordName}>{getHospitalDisplayName(hospital, language)}</strong>
        <p className={styles.recordDate}>
          {t.categories[hospital.category]} · {regionLabel}
        </p>
        <p className={styles.recordMeta}>{hospital.address}</p>
        <div className={styles.badgeRow}>
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
        <div className={styles.actionRow}>
          <Link className={styles.secondaryButton} href={`${ROUTES.HOSPITAL_DETAIL}/${hospital.id}`}>
            {t.hospital.detail}
          </Link>
          <button type="button" className={styles.primaryButton} onClick={onSelect}>
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
