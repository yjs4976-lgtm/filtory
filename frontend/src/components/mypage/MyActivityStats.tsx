"use client"

import Link from "next/link"
import { AlertCircle, Bookmark, ChartNoAxesColumnIncreasing, ChevronRight } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface MyActivityStatsProps {
  nickname: string
  analysisCount: number
  savedHospitalCount: number
  reportCount: number
}

export function MyActivityStats({ nickname, analysisCount, savedHospitalCount, reportCount }: MyActivityStatsProps) {
  const stats = [
    { label: "총 분석", value: `${analysisCount}회`, icon: ChartNoAxesColumnIncreasing, href: ROUTES.MYPAGE_HISTORY },
    { label: "저장 병원", value: `${savedHospitalCount}개`, icon: Bookmark, href: ROUTES.MYPAGE_SAVED },
    { label: "신고 내역", value: `${reportCount}개`, icon: AlertCircle, href: ROUTES.MYPAGE_REPORTS },
  ]

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{nickname}님, 오늘도 신뢰할 수 있는 병원 정보를 확인해보세요.</h2>
          <p className={styles.bodyText}>내 활동을 한눈에 보고 필요한 화면으로 바로 이동할 수 있어요.</p>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className={styles.summaryCard}>
            <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
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
