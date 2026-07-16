"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SectionPager } from "@/components/common/SectionPager"
import { InquiryStatusBadge, formatInquiryDate, inquiryShortDescription } from "@/components/help/InquiryShared"
import { AccountManageMenu } from "@/components/mypage/AccountManageMenu"
import { AppSettingsSection } from "@/components/mypage/AppSettingsSection"
import { DangerZone } from "@/components/mypage/DangerZone"
import { LoginRequiredPanel } from "@/components/mypage/LoginRequiredPanel"
import { MyActivityStats } from "@/components/mypage/MyActivityStats"
import { MyAnalysisSummary } from "@/components/mypage/MyAnalysisSummary"
import { MyPageUserCard } from "@/components/mypage/MyPageUserCard"
import { ProfileCompletionCard } from "@/components/mypage/ProfileCompletionCard"
import { RecentAnalysisPreview } from "@/components/mypage/RecentAnalysisPreview"
import { AnalysisUsageCard } from "@/components/membership/AnalysisUsageCard"
import { MyHospitals } from "@/components/mypage/MyHospitals"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem, MyReport, RecentViewedHospital, SavedHospital } from "@/lib/types"
import { analysisHistoryService } from "@/services/analysisHistoryService"
import { inquiryService, type Inquiry } from "@/services/inquiryService"
import { recentHospitalService } from "@/services/recentHospitalService"
import { reportService } from "@/services/reportService"
import { savedHospitalService } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

export default function MyPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [records, setRecords] = useState<AnalysisHistoryItem[]>([])
  const [savedHospitals, setSavedHospitals] = useState<SavedHospital[]>([])
  const [recentHospitals, setRecentHospitals] = useState<RecentViewedHospital[]>([])
  const [savedHospitalCount, setSavedHospitalCount] = useState(0)
  const [recentHospitalCount, setRecentHospitalCount] = useState(0)
  const [hospitalsLoading, setHospitalsLoading] = useState(true)
  const [hospitalsError, setHospitalsError] = useState(false)
  const [reports, setReports] = useState<MyReport[]>([])
  const [latestInquiry, setLatestInquiry] = useState<Inquiry | null>(null)

  const loadHospitals = useCallback(async () => {
    if (isLoading || !isAuthenticated) return
    setHospitalsLoading(true); setHospitalsError(false)
    try {
      const [saved, recent] = await Promise.all([
        savedHospitalService.getFavoriteHospitals({ page: 1, size: 3, sort: "latest" }),
        recentHospitalService.getRecentHospitalPage(1, 3),
      ])
      setSavedHospitals(saved.items); setSavedHospitalCount(saved.total)
      setRecentHospitals(recent.items); setRecentHospitalCount(recent.total)
    } catch { setHospitalsError(true) } finally { setHospitalsLoading(false) }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadHospitals(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHospitals])

  useEffect(() => {
    let alive = true

    if (isLoading || !isAuthenticated) {
      return
    }

    Promise.all([
      analysisHistoryService.getAnalysisHistory(user?.id),
      reportService.getMyReports(),
    ])
      .then(([historyItems, reportItems]) => {
        if (!alive) return
        setRecords(historyItems)
        setReports(reportItems)
      })
      .catch(() => {
        if (!alive) return
        setRecords([])
        setReports([])
      })

    inquiryService
      .getMyInquiries({ perPage: 1 })
      .then((result) => {
        if (!alive) return
        setLatestInquiry(result.items[0] ?? null)
      })
      .catch(() => {
        if (!alive) return
        setLatestInquiry(null)
      })

    return () => {
      alive = false
    }
  }, [isAuthenticated, isLoading, user?.id])

  const authenticatedSections = [
    {
      id: "profile",
      content: (
        <div className={styles.stackMd}>
          <MyPageUserCard />
          <MyActivityStats
            nickname={user?.nickname || user?.name || "User"}
            analysisCount={records.length}
            savedHospitalCount={savedHospitalCount}
            reportCount={reports.length}
          />
          <ProfileCompletionCard user={user} />
        </div>
      ),
    },
    {
      id: "activity",
      content: (
        <div className={styles.stackMd}>
          <AnalysisUsageCard />
          <MyAnalysisSummary records={records} />
          <RecentAnalysisPreview records={records} />
        </div>
      ),
    },
    {
      id: "hospitals",
      content: (
        <MyHospitals
          recent={recentHospitals} favorites={savedHospitals}
          recentTotal={recentHospitalCount} favoriteTotal={savedHospitalCount}
          loading={hospitalsLoading} error={hospitalsError} onRetry={loadHospitals}
          onFavoritesChange={(favorites, total, hospitalId, isFavorite) => {
            setSavedHospitals(favorites); setSavedHospitalCount(total)
            setRecentHospitals((items) => items.map((item) => item.id === hospitalId ? { ...item, isFavorite } : item))
          }}
        />
      ),
    },
    {
      id: "account",
      content: (
        <div className={styles.stackMd}>
          <AccountManageMenu />
        </div>
      ),
    },
    {
      id: "settings",
      content: (
        <div className={styles.stackMd}>
          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.help.mypageCardTitle}</h2>
            <p className={styles.bodyText}>{t.help.mypageCardDescription}</p>
            {latestInquiry && (
              <div className={styles.helpMypageStatus}>
                <div className={styles.rowBetween}>
                  <InquiryStatusBadge status={latestInquiry.status} label={t.help.status[latestInquiry.status]} />
                  <span>{formatInquiryDate(latestInquiry.createdAt)}</span>
                </div>
                <strong>{latestInquiry.title}</strong>
                <p>{inquiryShortDescription(latestInquiry, t.help.statusDescriptions)}</p>
              </div>
            )}
            <Link href={ROUTES.HELP} className={styles.primaryButton}>
              {t.help.moveToHelp}
            </Link>
          </section>
          <AppSettingsSection />
          <DangerZone />
        </div>
      ),
    },
  ]

  return (
    <AppShell title={t.mypage.title} showBack>
      {isLoading ? (
        <LoadingSpinner />
      ) : !isAuthenticated ? (
        <LoginRequiredPanel />
      ) : (
        <SectionPager sections={authenticatedSections} previousLabel={t.common.previous} nextLabel={t.common.next} />
      )}
    </AppShell>
  )
}
