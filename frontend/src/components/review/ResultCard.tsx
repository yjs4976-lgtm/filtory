"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, FileText, Info, RotateCcw, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { mockAnalysisResult } from "@/lib/mockData"
import { getTrustLevel } from "@/lib/score"
import { ChatbotConnectCard } from "@/components/result/ChatbotConnectCard"
import { ForeignerFriendlyRating } from "@/components/result/ForeignerFriendlyRating"
import { ResultActionCard } from "@/components/result/ResultActionCard"
import styles from "@/styles/App.module.css"
import { ScoreCircle } from "./ScoreCircle"

function ScoreBar({ label, value, tone }) {
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

export function ResultCard() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const result = mockAnalysisResult
  const trustLevel = getTrustLevel(result.total_score)
  const level = t.trustLevels[trustLevel.key]

  return (
    <div className={styles.resultStack}>
      <section className={`${styles.card} ${styles.scoreCard}`}>
        <p className={styles.mutedText}>{result.hospital_name}</p>
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
