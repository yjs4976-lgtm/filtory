import { Sparkles } from "lucide-react"
import type { CompareResult } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface HospitalCompareSummaryProps {
  result: CompareResult
}

export function HospitalCompareSummary({ result }: HospitalCompareSummaryProps) {
  const { t } = useLanguage()
  const recommended = result.hospitals.find((hospital) => hospital.id === result.recommendedHospitalId)

  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <Sparkles className={styles.iconSm} />
      </span>
      <div>
        <p className={styles.memberEyebrow}>{t.mypage.recommendation}</p>
        <h2 className={styles.titleMd}>{recommended?.hospitalName ?? t.mypage.selectedHospitals}{t.mypage.reviewFirst}</h2>
        <p className={styles.bodyText}>{result.summary}</p>
      </div>
    </section>
  )
}
