"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { AccountManageMenu } from "@/components/mypage/AccountManageMenu"
import { AiRecommendationCard } from "@/components/mypage/AiRecommendationCard"
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

export default function MyPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [records, setRecords] = useState<AnalysisHistoryItem[]>([])
  const [savedHospitals, setSavedHospitals] = useState<SavedHospital[]>([])
  const [recentHospitals, setRecentHospitals] = useState<RecentViewedHospital[]>([])
  const [reports, setReports] = useState<MyReport[]>([])

  useEffect(() => {
    let alive = true

    if (isLoading || !isAuthenticated) {
      return
    }

    Promise.all([
      analysisHistoryService.getAnalysisHistory(),
      savedHospitalService.getSavedHospitals(),
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
  }, [isAuthenticated, isLoading])

  return (
    <AppShell title={t.mypage.title} showBack>
      {isLoading ? (
        <LoadingSpinner />
      ) : !isAuthenticated ? (
        <LoginRequiredPanel />
      ) : (
        <>
          <MyPageUserCard />
          <MyActivityStats
            nickname={user?.nickname || user?.name || "Filtory"}
            analysisCount={records.length}
            savedHospitalCount={savedHospitals.length}
            reportCount={reports.length}
          />
          <ProfileCompletionCard user={user} />
          <MyAnalysisSummary records={records} />
          <RecentAnalysisPreview records={records} />
          <RecentViewedHospitals hospitals={recentHospitals} />
          <SavedHospitalList hospitals={savedHospitals} />
          <AiRecommendationCard records={records} />
          <AccountManageMenu user={user} />
          <AppSettingsSection />
          <DangerZone />
        </>
      )}
    </AppShell>
  )
}
