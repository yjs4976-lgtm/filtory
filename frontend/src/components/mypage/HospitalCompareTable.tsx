import type { CompareHospital, HospitalCategory } from "@/lib/types"
import { formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface HospitalCompareTableProps {
  category: HospitalCategory
  hospitals: CompareHospital[]
}

function getCategoryMetrics(category: HospitalCategory, hospital: CompareHospital) {
  if (category === "dental") {
    const metrics = hospital.dentalMetrics
    return [
      ["과잉진료 의심", metrics?.overtreatmentSuspicion],
      ["가격/비용 언급", metrics?.priceMentionLevel],
      ["치료 설명 친절도", metrics?.explanationKindness],
      ["재방문 후기", metrics?.revisitReviewLevel],
      ["통증 관련 후기", metrics?.painMentionLevel],
      ["대기시간 언급", metrics?.waitingMentionLevel],
    ]
  }
  if (category === "eye") {
    const metrics = hospital.eyeMetrics
    return [
      ["검사 설명 친절도", metrics?.examExplanation],
      ["수술/시술 후기 신뢰도", metrics?.surgeryReviewTrust],
      ["사후관리 언급", metrics?.aftercareMention],
      ["장비/검진 정보", metrics?.equipmentInfo],
      ["대기시간 언급", metrics?.waitingMentionLevel],
      ["상담 만족도", metrics?.consultationSatisfaction],
    ]
  }
  const metrics = hospital.dermatologyMetrics
  return [
    ["시술 효과 후기", metrics?.treatmentEffectReview],
    ["광고성 후기 의심", metrics?.adReviewSuspicion],
    ["가격/이벤트성 문구", metrics?.eventPhraseLevel],
    ["상담 친절도", metrics?.consultationKindness],
    ["재방문 후기", metrics?.revisitReviewLevel],
    ["전후 변화 설명", metrics?.beforeAfterDetail],
  ]
}

export function HospitalCompareTable({ category, hospitals }: HospitalCompareTableProps) {
  const rows = [
    ["리뷰 신뢰도", (hospital: CompareHospital) => `${hospital.trustScore}점`],
    ["광고 의심 정도", (hospital: CompareHospital) => `${hospital.adSuspicionScore}점`],
    ["정보 완성도", (hospital: CompareHospital) => `${hospital.infoCompletenessScore}점`],
    ["글로벌 접근성", (hospital: CompareHospital) => formatStars(hospital.globalAccessRating)],
    ["리뷰 수", (hospital: CompareHospital) => `${hospital.reviewCount}개`],
    ["최근 리뷰 비율", (hospital: CompareHospital) => `${hospital.recentReviewRatio}%`],
    ["부정 리뷰 비율", (hospital: CompareHospital) => `${hospital.negativeReviewRatio}%`],
    ["최근 분석일", (hospital: CompareHospital) => hospital.lastAnalyzedAt ?? "-"],
  ] as const
  const metricRows = getCategoryMetrics(category, hospitals[0]).map(([label]) => [
    label,
    (hospital: CompareHospital) => getCategoryMetrics(category, hospital).find(([name]) => name === label)?.[1] ?? "-",
  ] as const)

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>비교 결과</h2>
      <div className={styles.compareTableWrap}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>기준</th>
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
