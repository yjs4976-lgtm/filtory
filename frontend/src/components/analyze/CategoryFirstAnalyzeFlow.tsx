"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, FileCheck2, LinkIcon, LoaderCircle, MapPinned, Search, Star } from "lucide-react"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/useToast"
import {
  getDemoReviewsForHospital,
  getRegionLabel,
  hospitalRegions,
  searchDemoHospitals,
} from "@/lib/mockHospitals"
import { getTrustLevelKey, normalizeTrustLevelKey } from "@/lib/score"
import { writeCurrentReviewAnalysis } from "@/lib/analysisStorage"
import type {
  AnalysisHistoryItem,
  HospitalCategory,
  HospitalItem,
  HospitalRegionCode,
  HospitalReviewItem,
  ReviewAnalyzeResponse,
} from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import { analysisHistoryService } from "@/services/analysisHistoryService"
import { reviewAnalysisService } from "@/services/reviewAnalysisService"
import styles from "@/styles/App.module.css"

type SearchMode = "region" | "free"

const categoryToHistoryName: Record<HospitalCategory, "skin" | "eye" | "dental"> = {
  derma: "skin",
  eye: "eye",
  dental: "dental",
}

const PAGE_SIZE = 3

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

function adSuspicionScore(level: ReviewAnalyzeResponse["adSuspicionLevel"]) {
  if (level === "high") return 75
  if (level === "medium") return 45
  return 18
}

function concreteExperienceLevel(informationLevel: string): "low" | "medium" | "high" {
  if (informationLevel === "구체적") return "high"
  if (informationLevel === "보통") return "medium"
  return "low"
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
  const foreignAccessibilityStars = hospital
    ? [hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl, hospital.phone].filter(Boolean).length
    : 0

  return {
    id: `analysis-${Date.now()}`,
    userId,
    hospitalName,
    category,
    hospitalCategory: categoryToHistoryName[category],
    hospitalAddress: hospital?.address,
    region: hospital?.region,
    sourceName: hospital?.sourceName,
    sourceUrl: hospital?.sourceUrl,
    score: response.trustScore,
    foreignerFriendlyScore: foreignAccessibilityStars * 20,
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    selectedReviewCount,
    totalReviewCount,
    trustScore: response.trustScore,
    trustLevel: response.trustLevelKey,
    trustGrade: response.trustGrade,
    trustLevelKey: response.trustLevelKey,
    adSuspicion: response.adSuspicion,
    adSuspicionScore: adSuspicionScore(response.adSuspicionLevel),
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
    infoCompletenessScore: hospital
      ? [hospital.address, hospital.phone, hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl].filter(Boolean).length * 20
      : 0,
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
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [searchMode, setSearchMode] = useState<SearchMode>("region")
  const [region, setRegion] = useState<HospitalRegionCode>("seoul")
  const [query, setQuery] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<HospitalItem[]>([])
  const [hospitalPage, setHospitalPage] = useState(0)
  const [selectedHospital, setSelectedHospital] = useState<HospitalItem | null>(null)
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [reviewPage, setReviewPage] = useState(0)
  const [directHospitalName, setDirectHospitalName] = useState("")
  const [directReviewText, setDirectReviewText] = useState("")
  const [analysisResult, setAnalysisResult] = useState<ApiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState("")
  const [inputError, setInputError] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const reviews = useMemo(() => (selectedHospital ? getDemoReviewsForHospital(selectedHospital) : []), [selectedHospital])
  const selectedReviews = reviews.filter((review) => selectedReviewIds.includes(review.id))
  const progressStep = analysisResult ? 4 : selectedHospital ? 3 : hasSearched ? 2 : searchMode ? 1 : 0
  const hospitalTotalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const visibleHospitals = results.slice(hospitalPage * PAGE_SIZE, hospitalPage * PAGE_SIZE + PAGE_SIZE)
  const reviewTotalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const visibleReviews = reviews.slice(reviewPage * PAGE_SIZE, reviewPage * PAGE_SIZE + PAGE_SIZE)

  const handleSearch = () => {
    const nextResults = searchDemoHospitals({
      category,
      region: searchMode === "region" ? region : undefined,
      query,
    })
    setResults(nextResults)
    setHasSearched(true)
    setHospitalPage(0)
    setSelectedHospital(null)
    setSelectedReviewIds([])
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
  }

  const resetSearchState = () => {
    setHasSearched(false)
    setResults([])
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

  const handleSearchModeChange = (nextMode: SearchMode) => {
    setSearchMode(nextMode)
    resetSearchState()
  }

  const handleRegionChange = (nextRegion: HospitalRegionCode) => {
    setRegion(nextRegion)
    resetSearchState()
  }

  const handleOpenReviews = (hospital: HospitalItem) => {
    const nextReviews = getDemoReviewsForHospital(hospital)
    setSelectedHospital(hospital)
    setSelectedReviewIds(nextReviews.map((review) => review.id))
    setReviewPage(0)
    setAnalysisResult(null)
    setIsSaved(false)
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
    const reviewText = directReviewText.trim()
    if (isAnalyzing) return
    if (!hospitalName || !reviewText) {
      setInputError(t.analyze.inputRequired)
      setAnalyzeError("")
      return
    }

    await analyzeWithApi({
      hospitalName,
      reviewText,
      selectedReviewCount: 1,
      totalReviewCount: 1,
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
    setQuery("")
  }

  return (
    <section className={styles.stackMd}>
      <div className={`${styles.accentCard} ${styles.stackSm}`}>
        <h1 className={styles.titleLg}>{t.analyze.flowTitle}</h1>
        <p className={styles.bodyText}>{t.analyze.flowDescription}</p>
      </div>

      <ol className={styles.stepProgress}>
        {t.analyze.steps.map((label, index) => (
          <li key={label} className={index <= progressStep ? styles.stepActive : ""}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <h2 className={styles.titleMd}>{t.analyze.selectCategoryTitle}</h2>
        <CategorySelector selected={category} onSelect={handleCategoryChange} />
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div>
          <h2 className={styles.titleMd}>{t.analyze.directAnalyzeTitle}</h2>
          <p className={styles.bodyText}>{t.analyze.directAnalyzeDescription}</p>
        </div>
        <label className={styles.label} htmlFor="direct-hospital-name">
          {t.analyze.hospitalLabel}
          <input
            id="direct-hospital-name"
            className={styles.input}
            type="text"
            placeholder={t.analyze.hospitalPlaceholder}
            value={directHospitalName}
            onChange={(event) => setDirectHospitalName(event.target.value)}
          />
        </label>
        <label className={styles.label} htmlFor="direct-review-text">
          {t.analyze.reviewLabel}
          <textarea
            id="direct-review-text"
            className={styles.textarea}
            placeholder={t.analyze.reviewPlaceholder}
            value={directReviewText}
            onChange={(event) => setDirectReviewText(event.target.value)}
          />
        </label>
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

      <section className={`${styles.card} ${styles.stackSm}`}>
        <h2 className={styles.titleMd}>{t.analyze.searchModeTitle}</h2>
        <div className={styles.searchModeGrid}>
          <button
            type="button"
            className={`${styles.searchModeCard} ${searchMode === "region" ? styles.searchModeCardActive : ""}`}
            onClick={() => handleSearchModeChange("region")}
          >
            <strong>{t.analyze.searchByRegion}</strong>
            <span>{t.analyze.searchByRegionDesc}</span>
          </button>
          <button
            type="button"
            className={`${styles.searchModeCard} ${searchMode === "free" ? styles.searchModeCardActive : ""}`}
            onClick={() => handleSearchModeChange("free")}
          >
            <strong>{t.analyze.freeSearch}</strong>
            <span>{t.analyze.freeSearchDesc}</span>
          </button>
        </div>
      </section>

      {searchMode === "region" && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <h2 className={styles.titleMd}>{t.analyze.selectRegionTitle}</h2>
          <div className={styles.regionGrid}>
            {hospitalRegions.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`${styles.regionButton} ${region === item.code ? styles.regionButtonActive : ""}`}
                onClick={() => handleRegionChange(item.code)}
              >
                {language === "ko" ? item.ko : item.en}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={`${styles.card} ${styles.stackSm}`}>
        <h2 className={styles.titleMd}>{t.analyze.searchTitle}</h2>
        <label className={styles.label} htmlFor="hospital-search">
          <span className={styles.mutedText}>{t.analyze.searchHelp}</span>
          <div className={styles.inlineField}>
            <input
              id="hospital-search"
              className={styles.input}
              type="search"
              placeholder={t.analyze.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch()
              }}
            />
            <button type="button" className={styles.smallPillButton} onClick={handleSearch}>
              <Search className={styles.iconXs} />
              {t.analyze.searchButton}
            </button>
          </div>
        </label>
      </section>

      {hasSearched && (
        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>{t.analyze.searchResults}</h2>
          {results.length === 0 ? (
            <article className={`${styles.emptyCard} ${styles.stackSm}`}>
              <h3 className={styles.titleMd}>{t.analyze.noSearchResults}</h3>
              <p className={styles.bodyText}>{t.analyze.noSearchResultsDescription}</p>
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
                    regionLabel={getRegionLabel(hospital.region, language)}
                    onViewReviews={() => handleOpenReviews(hospital)}
                    onAnalyze={() => handleAnalyzeHospitalReviews(hospital, getDemoReviewsForHospital(hospital))}
                    disabled={isAnalyzing}
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

      {selectedHospital && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.titleMd}>{t.analyze.reviewListTitle}</h2>
              <p className={styles.bodyText}>
                {selectedHospital.name} · {getRegionLabel(selectedHospital.region, language)}
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
  )
}

function HospitalResultCard({
  hospital,
  regionLabel,
  onViewReviews,
  onAnalyze,
  disabled,
}: {
  hospital: HospitalItem
  regionLabel: string
  onViewReviews: () => void
  onAnalyze: () => void
  disabled?: boolean
}) {
  const { t } = useLanguage()

  return (
    <article className={`${styles.recordButton} ${styles.hospitalResultCard}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <MapPinned className={styles.iconSm} />
      </span>
      <div className={styles.recordBody}>
        <strong className={styles.recordName}>{hospital.name}</strong>
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
          <button type="button" className={styles.secondaryButton} onClick={onViewReviews}>
            {t.analyze.viewReviews}
          </button>
          <button type="button" className={styles.primaryButton} disabled={disabled} onClick={onAnalyze}>
            {t.analyze.analyzeHospital}
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
