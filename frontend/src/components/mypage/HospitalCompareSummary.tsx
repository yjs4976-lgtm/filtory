import { Sparkles } from "lucide-react"
import type { CompareResult } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface HospitalCompareSummaryProps {
  result: CompareResult
}

export function HospitalCompareSummary({ result }: HospitalCompareSummaryProps) {
  const recommended = result.hospitals.find((hospital) => hospital.id === result.recommendedHospitalId)

  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <Sparkles className={styles.iconSm} />
      </span>
      <div>
        <p className={styles.memberEyebrow}>Filtory 추천</p>
        <h2 className={styles.titleMd}>{recommended?.hospitalName ?? "선택한 병원"}을 먼저 확인해보세요.</h2>
        <p className={styles.bodyText}>{result.summary}</p>
      </div>
    </section>
  )
}
