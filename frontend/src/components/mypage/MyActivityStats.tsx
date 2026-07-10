"use client"

import Link from "next/link"
import { AlertCircle, Bookmark, ChartNoAxesColumnIncreasing, ChevronRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface MyActivityStatsProps {
  nickname: string
  analysisCount: number
  savedHospitalCount: number
  reportCount: number
}

export function MyActivityStats({ nickname, analysisCount, savedHospitalCount, reportCount }: MyActivityStatsProps) {
  const { t } = useLanguage()
  const stats = [
    {
      label: t.mypage.totalAnalysesShort,
      value: `${analysisCount}${t.mypage.analysisCountSuffix}`,
      icon: ChartNoAxesColumnIncreasing,
      href: ROUTES.MYPAGE_HISTORY,
      tone: styles.iconLavender,
    },
    {
      label: t.mypage.savedHospitalsShort,
      value: `${savedHospitalCount}${t.mypage.savedCountSuffix}`,
      icon: Bookmark,
      href: ROUTES.MYPAGE_SAVED,
      tone: styles.iconMint,
    },
    {
      label: t.mypage.reportsShort,
      value: `${reportCount}${t.mypage.reportCountSuffix}`,
      icon: AlertCircle,
      href: ROUTES.MYPAGE_REPORTS,
      tone: styles.iconPink,
    },
  ]
  const greeting = t.mypage.activityGreeting.replace("{name}", nickname)

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{greeting}</h2>
          <p className={styles.bodyText}>{t.mypage.activityDescription}</p>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        {stats.map(({ label, value, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className={styles.summaryCard}>
            <span className={`${styles.iconBoxSmall} ${tone}`}>
              <Icon className={styles.iconSm} />
            </span>
            <span>{label}</span>
            <strong>{value}</strong>
            <ChevronRight className={styles.iconXs} />
          </Link>
        ))}
      </div>
    </section>
  )
}
