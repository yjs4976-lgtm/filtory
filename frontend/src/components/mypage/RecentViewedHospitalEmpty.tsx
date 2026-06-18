import { Clock3 } from "lucide-react"
import styles from "@/styles/App.module.css"

export function RecentViewedHospitalEmpty() {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
        <Clock3 className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>최근 본 병원이 없어요.</h2>
      <p className={styles.bodyText}>최근에 확인한 병원을 다시 볼 수 있도록 이곳에 표시할게요.</p>
    </section>
  )
}
