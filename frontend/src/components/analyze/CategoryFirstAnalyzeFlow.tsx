"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, FileCheck2, LinkIcon, MapPinned, Search, Star } from "lucide-react"
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
import type {
  AnalysisHistoryItem,
  HospitalCategory,
  HospitalItem,
  HospitalRegionCode,
  HospitalReviewItem,
} from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import { analysisHistoryService } from "@/services/analysisHistoryService"
import styles from "@/styles/App.module.css"

type SearchMode = "region" | "free"

const categoryToHistoryName: Record<HospitalCategory, "skin" | "eye" | "dental"> = {
  derma: "skin",
  eye: "eye",
  dental: "dental",
}

const PAGE_SIZE = 3

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

function createAnalysisResult({
  hospital,
  reviews,
  userId,
  summary,
}: {
  hospital: HospitalItem
  reviews: HospitalReviewItem[]
  userId?: string | number
  summary: string
}): AnalysisHistoryItem {
  const joinedText = reviews.map((review) => review.content).join(" ")
  const adMatches = joinedText.match(/이벤트|예약|추천|할인|당일/g) ?? []
  const concreteMatches = joinedText.match(/설명|관리|비용|일정|검사|치료|통증|주의사항/g) ?? []
  const positiveMatches = joinedText.match(/자세|안심|신뢰|편했|꼼꼼|차분|필요한/g) ?? []
  const negativeMatches = joinedText.match(/광고|부족|대기|확인|반복/g) ?? []
  const totalSentiment = Math.max(1, positiveMatches.length + negativeMatches.length)
  const selectedReviewCount = reviews.length
  const trustScore = Math.max(45, Math.min(96, 72 + concreteMatches.length * 3 - adMatches.length * 4 + selectedReviewCount * 2))
  const adSuspicionLevel = adMatches.length >= 4 ? "high" : adMatches.length >= 2 ? "medium" : "low"
  const repetitivePatternLevel = adMatches.length >= 3 ? "high" : adMatches.length >= 1 ? "medium" : "low"
  const concreteExperienceLevel = concreteMatches.length >= 6 ? "high" : concreteMatches.length >= 3 ? "medium" : "low"
  const foreignAccessibilityStars = [hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl, hospital.phone].filter(Boolean).length

  return {
    id: `analysis-${Date.now()}`,
    userId,
    hospitalName: hospital.name,
    category: hospital.category,
    hospitalCategory: categoryToHistoryName[hospital.category],
    hospitalAddress: hospital.address,
    region: hospital.region,
    sourceName: hospital.sourceName,
    sourceUrl: hospital.sourceUrl,
    score: trustScore,
    foreignerFriendlyScore: foreignAccessibilityStars * 20,
    createdAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    selectedReviewCount,
    totalReviewCount: hospital.reviewCount ?? selectedReviewCount,
    trustScore,
    trustLevel: getTrustLevelKey(trustScore),
    adSuspicionScore: adSuspicionLevel === "high" ? 75 : adSuspicionLevel === "medium" ? 45 : 18,
    adSuspicionLevel,
    repetitivePatternLevel,
    concreteExperienceLevel,
    positiveRatio: Math.round((positiveMatches.length / totalSentiment) * 100),
    negativeRatio: Math.round((negativeMatches.length / totalSentiment) * 100),
    summary,
    suspiciousPhrases: Array.from(new Set(adMatches)).slice(0, 4),
    trustworthyPhrases: Array.from(new Set(concreteMatches)).slice(0, 4),
    detectedReasons: [
      `selectedReviews:${selectedReviewCount}`,
      `adMatches:${adMatches.length}`,
      `concreteMatches:${concreteMatches.length}`,
    ],
    infoCompletenessScore: [hospital.address, hospital.phone, hospital.mapUrl, hospital.homepageUrl, hospital.sourceUrl].filter(Boolean)
      .length * 20,
    globalAccessRating: foreignAccessibilityStars,
    foreignAccessibilityStars,
    reviewCount: selectedReviewCount,
    resultStatus: "completed",
  }
}

export function CategoryFirstAnalyzeFlow({ userId }: { userId?: string | number }) {
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
  const [analysisResult, setAnalysisResult] = useState<AnalysisHistoryItem | null>(null)
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

  const handleAnalyzeHospitalReviews = (hospital: HospitalItem, targetReviews: HospitalReviewItem[]) => {
    if (targetReviews.length === 0) return
    const summary =
      language === "ko"
        ? targetReviews.length > 1
          ? `${hospital.name}의 선택 리뷰 ${targetReviews.length}개를 함께 분석했습니다. 구체적인 경험 표현과 반복 홍보 표현을 분리해 참고 점수로 계산했어요.`
          : `${hospital.name}의 선택 리뷰를 분석했습니다. 리뷰 수가 적어 추가 확인이 필요할 수 있어요.`
        : targetReviews.length > 1
          ? `${targetReviews.length} selected reviews for ${hospital.name} were analyzed together. Specific experience wording and repeated promotional patterns were separated into reference scores.`
          : `One selected review for ${hospital.name} was analyzed. More reviews may be helpful for a firmer judgment.`

    setSelectedHospital(hospital)
    setAnalysisResult(createAnalysisResult({ hospital, reviews: targetReviews, userId, summary }))
    setIsSaved(false)
  }

  const handleAnalyze = (targetReviews: HospitalReviewItem[]) => {
    if (!selectedHospital) return
    handleAnalyzeHospitalReviews(selectedHospital, targetReviews)
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
                  disabled={selectedReviews.length === 0}
                  onClick={() => handleAnalyze(selectedReviews)}
                >
                  {t.analyze.analyzeSelectedReviews}
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => handleAnalyze(reviews)}>
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
            <Metric label={t.analyze.trustLevel} value={trustLevelLabel(t, analysisResult.trustLevel, analysisResult.trustScore)} />
            <Metric label={t.analyze.adSuspicionLevel} value={levelLabel(t, analysisResult.adSuspicionLevel)} />
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
            <span className={styles.neutralPill}>
              {t.analyze.positiveRatio} {analysisResult.positiveRatio}%
            </span>
            <span className={styles.neutralPill}>
              {t.analyze.negativeRatio} {analysisResult.negativeRatio}%
            </span>
          </div>
          <PhraseList title={t.analyze.suspiciousPhrases} items={analysisResult.suspiciousPhrases ?? []} />
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
}: {
  hospital: HospitalItem
  regionLabel: string
  onViewReviews: () => void
  onAnalyze: () => void
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
          <button type="button" className={styles.primaryButton} onClick={onAnalyze}>
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
