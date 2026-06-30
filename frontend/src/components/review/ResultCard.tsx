"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, FileText, Info, RotateCcw, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
import { mockAnalysisResult } from "@/lib/mockData"
import { getTrustLevel } from "@/lib/score"
import type { CurrentReviewAnalysis, Language } from "@/lib/types"
import { ChatbotConnectCard } from "@/components/result/ChatbotConnectCard"
import { ForeignerFriendlyRating } from "@/components/result/ForeignerFriendlyRating"
import { ResultActionCard } from "@/components/result/ResultActionCard"
import styles from "@/styles/App.module.css"
import { ScoreCircle } from "./ScoreCircle"

type SignalLevel = "low" | "medium" | "high"

function MetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className={styles.resultMetricRow}>
      <span>{label}</span>
      {valueClassName ? <span className={valueClassName}>{value}</span> : <strong>{value}</strong>}
    </div>
  )
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={styles.scoreBarRow}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function suspicionScore(level: CurrentReviewAnalysis["adSuspicionLevel"]) {
  if (level === "high") return 85
  if (level === "medium") return 55
  return 20
}

function signalLevelScore(level: SignalLevel) {
  if (level === "high") return 85
  if (level === "medium") return 60
  return 30
}

function globalAccessibilityScore(result: CurrentReviewAnalysis) {
  const maxScore = result.globalAccessibilityMaxScore || 5
  const score = typeof result.globalAccessibilityScore === "number" ? result.globalAccessibilityScore : 3
  return {
    score: clamp(Math.round(score), 0, maxScore),
    maxScore,
  }
}

function globalAccessibilityPercent(result: CurrentReviewAnalysis) {
  const { score, maxScore } = globalAccessibilityScore(result)
  return Math.round((score / maxScore) * 100)
}

function formatTrustLevelKey(level: CurrentReviewAnalysis["trustLevelKey"], language: Language) {
  const labels = {
    ko: {
      veryHigh: "매우 높음",
      high: "높음",
      caution: "주의",
      concern: "의심",
      veryConcern: "매우 의심",
    },
    en: {
      veryHigh: "Very high",
      high: "High",
      caution: "Caution",
      concern: "Suspicious",
      veryConcern: "Very suspicious",
    },
  }

  return labels[language][level]
}

function formatSignalLevel(level: SignalLevel | undefined, language: Language) {
  const labels = {
    ko: {
      low: "낮음",
      medium: "보통",
      high: "높음",
    },
    en: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },
  }

  return labels[language][level ?? "medium"]
}

function informationCompletenessLevel(result: CurrentReviewAnalysis): SignalLevel {
  if (result.informationCompleteness) return result.informationCompleteness
  if (result.informationLevel === "구체적") return "high"
  if (result.informationLevel === "정보 부족") return "low"
  return "medium"
}

function repetitionLevel(result: CurrentReviewAnalysis): SignalLevel {
  if (result.repetitionLevel) return result.repetitionLevel
  return result.repetitivePhrases.length > 0 ? result.adSuspicionLevel : "low"
}

function localizeResultText(text: string, language: Language) {
  if (language === "ko") return text

  const knownText: Record<string, string> = {
    "리뷰 전반은 자연스럽지만 일부 광고성 표현이 포함되어 있습니다.":
      "The review feels mostly natural, but includes some promotional wording.",
    "참고는 가능하지만, 여러 리뷰와 병원 정보를 함께 확인하는 것이 좋습니다.":
      "You can use this as a reference, but it is better to compare it with other reviews and clinic information.",
    "일부 표현이 과하게 긍정적으로 반복됩니다.":
      "Some overly positive wording appears repeatedly.",
    "광고성 리뷰에서 자주 보이는 문장이 일부 포함되어 있습니다.":
      "Some phrases often seen in promotional reviews are included.",
    "과하게 긍정적인 표현": "Overly positive wording",
    "광고성 리뷰에서 자주 보이는 문장": "Phrase often seen in promotional reviews",
  }

  return knownText[text] ?? text
}

function displayHospitalName(result: CurrentReviewAnalysis, language: Language) {
  if (language === "en") {
    return result.hospitalEnglishName || result.hospitalNameEn || result.hospitalName
  }

  return result.hospitalNameKo || result.hospitalName
}

function StarRating({
  score,
  maxScore,
  language,
}: {
  score: number
  maxScore: number
  language: Language
}) {
  const ariaLabel = language === "ko" ? `${maxScore}점 만점에 ${score}점` : `${score} out of ${maxScore}`

  return (
    <span className={styles.inlineStarRating} aria-label={ariaLabel} title={ariaLabel}>
      <span className={styles.starFilled}>{"★".repeat(score)}</span>
      <span className={styles.starEmpty}>{"☆".repeat(maxScore - score)}</span>
      <strong>
        {score}/{maxScore}
      </strong>
    </span>
  )
}

export function ResultCard() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [apiResult, setApiResult] = useState<CurrentReviewAnalysis | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setApiResult(readCurrentReviewAnalysis())
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  if (apiResult) {
    const trustLevel = getTrustLevel(apiResult.trustScore)
    const categoryLabel = t.categories[apiResult.category]
    const trustLevelLabel = formatTrustLevelKey(apiResult.trustLevelKey, language)
    const adSuspicionLabel = formatSignalLevel(apiResult.adSuspicionLevel, language)
    const repetitionLabel = formatSignalLevel(repetitionLevel(apiResult), language)
    const informationCompletenessLabel = formatSignalLevel(informationCompletenessLevel(apiResult), language)
    const accessibility = globalAccessibilityScore(apiResult)
    const accessibilityPercent = globalAccessibilityPercent(apiResult)
    const globalAccessibilityChecks = Object.entries(apiResult.globalAccessibilityChecks ?? {}) as [
      keyof NonNullable<CurrentReviewAnalysis["globalAccessibilityChecks"]>,
      boolean | undefined,
    ][]

    return (
      <div className={styles.resultStack}>
        <section className={`${styles.card} ${styles.scoreCard}`}>
          <p className={styles.mutedText}>
            {displayHospitalName(apiResult, language)} · {categoryLabel}
          </p>
          <div className={styles.scoreCircleWrap}>
            <ScoreCircle score={apiResult.trustScore} label={t.result.trustScore} />
          </div>
          <div className={styles.trustBadge} style={{ backgroundColor: trustLevel.softColor }}>
            <ShieldCheck className={styles.iconSm} style={{ color: trustLevel.color }} />
            <span>{t.trustLevels[apiResult.trustLevelKey]}</span>
          </div>
          <div className={styles.resultMetricList}>
            <MetricRow label={t.analyze.trustLevel} value={trustLevelLabel} />
            <MetricRow label={t.analyze.adSuspicionLevel} value={adSuspicionLabel} />
            <MetricRow label={t.analyze.repetitivePattern} value={repetitionLabel} />
            <MetricRow label={t.analyze.infoCompleteness} value={informationCompletenessLabel} />
            <MetricRow
              label={t.analyze.foreignAccessibility}
              value={<StarRating score={accessibility.score} maxScore={accessibility.maxScore} language={language} />}
              valueClassName={styles.resultMetricValue}
            />
            {globalAccessibilityChecks.map(([key, value]) => (
              <MetricRow
                key={key}
                label={t.analyze.globalAccessibilityItems[key]}
                value={value ? t.analyze.available : t.analyze.missing}
              />
            ))}
          </div>
          <p className={styles.mutedText}>{t.result.reference}</p>
        </section>

        <ResultActionCard />

        <section className={`${styles.softCard} ${styles.stackMd}`}>
          <ScoreBar label={t.result.trustScore} value={apiResult.trustScore} tone={styles.fillMint} />
          <ScoreBar label={t.result.adScore} value={suspicionScore(apiResult.adSuspicionLevel)} tone={styles.fillPink} />
          <ScoreBar
            label={t.analyze.informationLevel}
            value={signalLevelScore(informationCompletenessLevel(apiResult))}
            tone={styles.fillPrimary}
          />
          <ScoreBar label={t.analyze.foreignAccessibility} value={accessibilityPercent} tone={styles.fillGold} />
        </section>

        <section className={`${styles.accentCard} ${styles.stackSm}`}>
          <div className={styles.row}>
            <Sparkles className={`${styles.iconSm} ${styles.iconPrimary}`} />
            <h2 className={styles.titleSm}>{t.result.summaryTitle}</h2>
          </div>
          <p className={styles.summaryText}>{localizeResultText(apiResult.summary, language)}</p>
        </section>

        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <Info className={`${styles.iconSm} ${styles.iconPrimary}`} />
            <h2 className={styles.titleSm}>{t.analyze.recommendation}</h2>
          </div>
          <p className={styles.summaryText}>{localizeResultText(apiResult.recommendation, language)}</p>
        </section>

        {apiResult.suspiciousPhrases.length > 0 && (
          <section className={`${styles.card} ${styles.stackSm}`}>
            <div className={styles.row}>
              <AlertTriangle className={`${styles.iconSm} ${styles.pinkText}`} />
              <h2 className={styles.titleSm}>{t.analyze.suspiciousPhrases}</h2>
            </div>
            <div className={styles.badgeRow}>
              {apiResult.suspiciousPhrases.map((phrase) => (
                <span key={phrase} className={styles.neutralPill}>
                  {localizeResultText(phrase, language)}
                </span>
              ))}
            </div>
          </section>
        )}

        {apiResult.repetitivePhrases.length > 0 && (
          <section className={`${styles.card} ${styles.stackSm}`}>
            <div className={styles.row}>
              <AlertTriangle className={`${styles.iconSm} ${styles.pinkText}`} />
              <h2 className={styles.titleSm}>{t.analyze.repetitivePhrases}</h2>
            </div>
            <div className={styles.badgeRow}>
              {apiResult.repetitivePhrases.map((phrase) => (
                <span key={phrase} className={styles.neutralPill}>
                  {localizeResultText(phrase, language)}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <FileText className={`${styles.iconSm} ${styles.mintText}`} />
            <h2 className={styles.titleSm}>{t.analyze.detectedPatterns}</h2>
          </div>
          <ul className={styles.list}>
            {apiResult.detectedPatterns.map((item) => (
              <li key={item} className={`${styles.listItem} ${styles.bgPeach}`}>
                <span className={`${styles.listDot} ${styles.fillPrimary}`} />
                <span>{localizeResultText(item, language)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.note}>
          <Info className={styles.iconXs} />
          <span>{t.result.reference}</span>
        </div>

        <ChatbotConnectCard />

        <div className={styles.stackSm}>
          <button type="button" className={styles.primaryButton}>
            <FileText className={styles.iconSm} />
            {t.result.detailCta}
          </button>
          <button type="button" onClick={() => router.push("/analyze")} className={styles.secondaryButton}>
            <RotateCcw className={styles.iconSm} />
            {t.result.retryCta}
          </button>
        </div>
      </div>
    )
  }

  const result = mockAnalysisResult
  const trustLevel = getTrustLevel(result.total_score)
  const level = t.trustLevels[trustLevel.key]

  return (
    <div className={styles.resultStack}>
      <section className={`${styles.card} ${styles.scoreCard}`}>
        <p className={styles.mutedText}>{language === "en" ? result.hospital_name_en : result.hospital_name}</p>
        <div className={styles.scoreCircleWrap}>
          <ScoreCircle score={result.total_score} label={t.result.totalScore} />
        </div>
        <div className={styles.trustBadge} style={{ backgroundColor: trustLevel.softColor }}>
          <ShieldCheck className={styles.iconSm} style={{ color: trustLevel.color }} />
          <span>{level}</span>
        </div>
        <p className={styles.mutedText}>{t.result.reference}</p>
      </section>

      <ResultActionCard />

      <section className={`${styles.softCard} ${styles.stackMd}`}>
        <ScoreBar label={t.result.trustScore} value={result.trust_score} tone={styles.fillMint} />
        <ScoreBar label={t.result.adScore} value={result.ad_score} tone={styles.fillPink} />
        <ScoreBar label={t.result.placeScore} value={result.place_score} tone={styles.fillPrimary} />
        <ForeignerFriendlyRating checks={result.foreigner_checks} />
      </section>

      <section className={`${styles.accentCard} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Sparkles className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{t.result.summaryTitle}</h2>
        </div>
        <p className={styles.summaryText}>{result.summary[language]}</p>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <AlertTriangle className={`${styles.iconSm} ${styles.pinkText}`} />
          <h2 className={styles.titleSm}>{t.result.concernsTitle}</h2>
        </div>
        <ul className={styles.list}>
          {result.concerns[language].map((item) => (
            <li key={item} className={`${styles.listItem} ${styles.bgPink}`}>
              <span className={`${styles.listDot} ${styles.fillPink}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <CheckCircle2 className={`${styles.iconSm} ${styles.mintText}`} />
          <h2 className={styles.titleSm}>{t.result.evidenceTitle}</h2>
        </div>
        <ul className={styles.list}>
          {result.evidence[language].map((item) => (
            <li key={item} className={`${styles.listItem} ${styles.bgMint}`}>
              <span className={`${styles.listDot} ${styles.fillMint}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.note}>
        <Info className={styles.iconXs} />
        <span>{t.result.reference}</span>
      </div>

      <ChatbotConnectCard />

      <div className={styles.stackSm}>
        <button type="button" className={styles.primaryButton}>
          <FileText className={styles.iconSm} />
          {t.result.detailCta}
        </button>
        <button type="button" onClick={() => router.push("/analyze")} className={styles.secondaryButton}>
          <RotateCcw className={styles.iconSm} />
          {t.result.retryCta}
        </button>
      </div>
    </div>
  )
}
