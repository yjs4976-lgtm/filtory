"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SectionPager } from "@/components/common/SectionPager"
import { InquiryStatusBadge, formatInquiryDate, inquiryShortDescription } from "@/components/help/InquiryShared"
import { AccountManageMenu } from "@/components/mypage/AccountManageMenu"
import { ChatbotModal } from "@/components/chatbot/ChatbotModal"
import { AppSettingsSection } from "@/components/mypage/AppSettingsSection"
import { DangerZone } from "@/components/mypage/DangerZone"
import { LoginRequiredPanel } from "@/components/mypage/LoginRequiredPanel"
import { MyActivityStats } from "@/components/mypage/MyActivityStats"
import { MyAnalysisSummary } from "@/components/mypage/MyAnalysisSummary"
import { MyPageUserCard } from "@/components/mypage/MyPageUserCard"
import { ProfileCompletionCard } from "@/components/mypage/ProfileCompletionCard"
import { RecentAnalysisPreview } from "@/components/mypage/RecentAnalysisPreview"
import { RecentViewedHospitals } from "@/components/mypage/RecentViewedHospitals"
import { SavedHospitalList } from "@/components/mypage/SavedHospitalList"
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
  const [reports, setReports] = useState<MyReport[]>([])
  const [latestInquiry, setLatestInquiry] = useState<Inquiry | null>(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

  useEffect(() => {
    let alive = true

    if (isLoading || !isAuthenticated) {
      return
    }

    Promise.all([
      analysisHistoryService.getAnalysisHistory(user?.id),
      savedHospitalService.getSavedHospitals(user?.id),
      recentHospitalService.getRecentViewedHospitals(),
      reportService.getMyReports(),
    ])
      .then(([historyItems, savedItems, recentItems, reportItems]) => {
        if (!alive) return
        setRecords(historyItems)
        setSavedHospitals(savedItems)
        setRecentHospitals(recentItems)
        setReports(reportItems)
      })
      .catch(() => {
        if (!alive) return
        setRecords([])
        setSavedHospitals([])
        setRecentHospitals([])
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
          <MyPageUserCard onChatbotToggle={() => setIsChatbotOpen((current) => !current)} isChatbotOpen={isChatbotOpen} />
          <ChatbotModal open={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
          <MyActivityStats
            nickname={user?.nickname || user?.name || "User"}
            analysisCount={records.length}
            savedHospitalCount={savedHospitals.length}
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
          <MyAnalysisSummary records={records} />
          <RecentAnalysisPreview records={records} />
        </div>
      ),
    },
    {
      id: "hospitals",
      content: (
        <div className={styles.stackMd}>
          <RecentViewedHospitals hospitals={recentHospitals} />
          <SavedHospitalList hospitals={savedHospitals} />
        </div>
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
