"use client"

import Link from "next/link"
import { ChevronRight, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface RecentAnalysisPreviewProps {
  records: AnalysisHistoryItem[]
}

function formatDate(value?: string, locale: string = "ko-KR") {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function formatAccessibilityScore(score?: number, pointsSuffix = "점") {
  const safeScore = Math.max(0, Math.min(100, score ?? 0))
  return `${safeScore}${pointsSuffix}`
}

export function RecentAnalysisPreview({ records }: RecentAnalysisPreviewProps) {
  const { t, language } = useLanguage()
  const locale = language === "ko" ? "ko-KR" : "en-US"
  const recentRecords = records.slice(0, 3)

  return (
    <section className={styles.stackSm}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.titleSm}>{t.mypage.recentReports}</h2>
        <Link href={ROUTES.MYPAGE_HISTORY} className={styles.seeAllButton}>
          {t.mypage.viewAllHistory}
          <ChevronRight className={styles.iconSm} />
        </Link>
      </div>

      {recentRecords.length === 0 ? (
        <article className={`${styles.emptyCard} ${styles.stackSm}`}>
          <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
            <Sparkles className={styles.iconSm} />
          </span>
          <div>
            <h3 className={styles.titleMd}>{t.mypage.emptyRecentTitle}</h3>
            <p className={styles.bodyText}>{t.mypage.emptyRecentDescription}</p>
          </div>
          <Link href={ROUTES.ANALYZE} className={styles.primaryButton}>
            {t.mypage.startAnalysis}
          </Link>
        </article>
      ) : (
        <div className={styles.recordList}>
          {recentRecords.map((item) => (
            <article key={item.id} className={styles.recordButton}>
              <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
                <Sparkles className={styles.iconSm} />
              </span>
              <span className={styles.recordBody}>
                <strong className={styles.recordName}>{item.hospitalName}</strong>
                <span className={styles.recordDate}>
                  {t.mypage.averageTrust} {item.score}
                  {t.mypage.pointsSuffix} · {formatDate(item.createdAt, locale)}
                </span>
                {item.foreignerFriendlyScore !== undefined && (
                  <span className={styles.recordMeta}>
                    {t.mypage.foreignerFriendliness}{" "}
                    {formatAccessibilityScore(item.foreignerFriendlyScore, t.mypage.pointsSuffix)}
                  </span>
                )}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
