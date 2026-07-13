"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageCircle, ShieldCheck, Trash2 } from "lucide-react"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { useLanguage } from "@/context/LanguageContext"
import { writeCurrentReviewAnalysisFromHistory } from "@/lib/analysisStorage"
import {
  buildAnalysisChatbotHref,
  buildChatbotContextFromAnalysis,
  getAnalysisResultId,
  writeSelectedChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { formatDisplayDate } from "@/lib/dateFormat"
import { getHistoryHospitalName, getHistoryMetaText } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import { formatSignalLevel, getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import { useAuth } from "@/hooks/useAuth"
import type { AnalysisHistoryItem, HospitalItem } from "@/lib/types"
import { formatFivePointRating } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface AnalysisHistoryCardProps {
  item: AnalysisHistoryItem
  onDelete: (id: string) => void
}

export function AnalysisHistoryCard({ item, onDelete }: AnalysisHistoryCardProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const adSuspicionLevel = formatSignalLevel(item.adSuspicionLevel, {
    low: t.analyze.low,
    medium: t.analyze.medium,
    high: t.analyze.high,
    caution: t.analyze.caution,
  })
  const date = formatDisplayDate(item.analyzedAt ?? item.createdAt, language)
  const hospitalName = getHistoryHospitalName(item, language)
  const metaText = getHistoryMetaText(item, language, t.categories[item.category])
  const favoriteHospital: HospitalItem = {
    id: String(item.hospitalId ?? item.externalPlaceId ?? ""),
    internalHospitalId: item.hospitalId,
    provider: item.hospitalId ? "filtory" : item.provider || item.sourceProvider,
    externalPlaceId: item.hospitalId ? undefined : item.externalPlaceId,
    name: hospitalName,
    category: item.category,
    region: "seoul",
    address: item.hospitalAddress || item.address || "",
    roadAddress: item.roadAddress,
    phone: item.phone,
    mapUrl: item.mapUrl,
  }
  const askWithResult = () => {
    const analysisResultId = getAnalysisResultId(item)
    if (analysisResultId) {
      router.push(buildAnalysisChatbotHref(analysisResultId))
      return
    }
    writeSelectedChatbotAnalysisContext(buildChatbotContextFromAnalysis(item), user?.id ?? null)
    router.push(ROUTES.CHATBOT)
  }
  const viewResult = () => {
    writeCurrentReviewAnalysisFromHistory(item)
  }

  return (
    <article className={`${styles.card} ${styles.stackSm} ${styles.historyRecordCard}`}>
      <FavoriteHospitalButton hospital={favoriteHospital} initialFavorite={item.isFavorite} favoriteHospitalId={item.favoriteHospitalId} iconOnly className={styles.historyRecordFavorite} />
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{hospitalName}</h2>
          <p className={styles.bodyText}>
            {metaText} · {date}
          </p>
        </div>
        <span className={styles.scoreSmall}>{trustScore}{t.mypage.pointsSuffix}</span>
      </div>
      <div className={styles.metricGrid}>
        <span className={styles.trustMetric}>
          <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
          {t.mypage.trustScoreLabel} {t.trustLevels[trustLevelKey]}
        </span>
        <span>{t.mypage.adSuspicionLabel} {adSuspicionLevel}</span>
        <span>{t.mypage.infoCompletenessLabel} {item.infoCompletenessScore ?? 0}{t.mypage.pointsSuffix}</span>
        <span>{t.mypage.globalLabel} {formatFivePointRating(item.globalAccessRating)}</span>
      </div>
      <div className={styles.actionRow}>
        <Link href={ROUTES.RESULT} className={styles.secondaryButton} onClick={viewResult}>
          {t.mypage.viewResult}
        </Link>
        <button type="button" className={styles.secondaryButton} onClick={askWithResult}>
          <MessageCircle className={styles.iconSm} />
          {t.chatbot.askWithResult}
        </button>
        <button type="button" className={styles.dangerButton} onClick={() => onDelete(item.id)}>
          <Trash2 className={styles.iconSm} />
          {t.mypage.deleteRecord}
        </button>
      </div>
    </article>
  )
}
