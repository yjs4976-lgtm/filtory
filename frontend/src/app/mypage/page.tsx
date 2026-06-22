"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SectionPager } from "@/components/common/SectionPager"
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
import type { AnalysisHistoryItem, MyReport, RecentViewedHospital, SavedHospital } from "@/lib/types"
import { analysisHistoryService } from "@/services/analysisHistoryService"
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
