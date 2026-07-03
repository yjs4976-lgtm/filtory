import type { CompareHospital, HospitalCategory } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import { formatFivePointRating } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface HospitalCompareTableProps {
  category: HospitalCategory
  hospitals: CompareHospital[]
}

function getCategoryMetrics(category: HospitalCategory, hospital: CompareHospital, labels: ReturnType<typeof useLanguage>["t"]["mypage"]) {
  if (category === "dental") {
    const metrics = hospital.dentalMetrics
    return [
      [labels.compareDentalOvertreatment, metrics?.overtreatmentSuspicion],
      [labels.compareDentalPrice, metrics?.priceMentionLevel],
      [labels.compareDentalExplanation, metrics?.explanationKindness],
      [labels.compareDentalRevisit, metrics?.revisitReviewLevel],
      [labels.compareDentalPain, metrics?.painMentionLevel],
      [labels.compareDentalWaiting, metrics?.waitingMentionLevel],
    ]
  }
  if (category === "eye") {
    const metrics = hospital.eyeMetrics
    return [
      [labels.compareEyeExam, metrics?.examExplanation],
      [labels.compareEyeSurgeryTrust, metrics?.surgeryReviewTrust],
      [labels.compareEyeAftercare, metrics?.aftercareMention],
      [labels.compareEyeEquipment, metrics?.equipmentInfo],
      [labels.compareEyeWaiting, metrics?.waitingMentionLevel],
      [labels.compareEyeConsultation, metrics?.consultationSatisfaction],
    ]
  }
  const metrics = hospital.dermatologyMetrics
  return [
    [labels.compareDermaEffect, metrics?.treatmentEffectReview],
    [labels.compareDermaAd, metrics?.adReviewSuspicion],
    [labels.compareDermaEvent, metrics?.eventPhraseLevel],
    [labels.compareDermaKindness, metrics?.consultationKindness],
    [labels.compareDermaRevisit, metrics?.revisitReviewLevel],
    [labels.compareDermaBeforeAfter, metrics?.beforeAfterDetail],
  ]
}

export function HospitalCompareTable({ category, hospitals }: HospitalCompareTableProps) {
  const { t } = useLanguage()
  const rows = [
    [t.mypage.compareMetricTrust, (hospital: CompareHospital) => `${hospital.trustScore}${t.common.pointsSuffix}`],
    [t.mypage.compareMetricAd, (hospital: CompareHospital) => `${hospital.adSuspicionScore}${t.common.pointsSuffix}`],
    [t.mypage.compareMetricInfo, (hospital: CompareHospital) => `${hospital.infoCompletenessScore}${t.common.pointsSuffix}`],
    [t.mypage.compareMetricGlobal, (hospital: CompareHospital) => formatFivePointRating(hospital.globalAccessRating)],
    [t.mypage.compareMetricReviewCount, (hospital: CompareHospital) => `${hospital.reviewCount}${t.common.countSuffix}`],
    [t.mypage.compareMetricRecentRatio, (hospital: CompareHospital) => `${hospital.recentReviewRatio}%`],
    [t.mypage.compareMetricNegativeRatio, (hospital: CompareHospital) => `${hospital.negativeReviewRatio}%`],
    [t.mypage.compareMetricLastAnalyzed, (hospital: CompareHospital) => hospital.lastAnalyzedAt ?? "-"],
  ] as const
  const metricRows = getCategoryMetrics(category, hospitals[0], t.mypage).map(([label]) => [
    label,
    (hospital: CompareHospital) => getCategoryMetrics(category, hospital, t.mypage).find(([name]) => name === label)?.[1] ?? "-",
  ] as const)

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.compareResultTitle}</h2>
      <div className={styles.compareTableWrap}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>{t.mypage.compareCriterion}</th>
              {hospitals.map((hospital) => (
                <th key={hospital.id}>{hospital.hospitalName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows, ...metricRows].map(([label, getValue]) => (
              <tr key={label}>
                <td>{label}</td>
                {hospitals.map((hospital) => (
                  <td key={hospital.id}>{getValue(hospital)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
