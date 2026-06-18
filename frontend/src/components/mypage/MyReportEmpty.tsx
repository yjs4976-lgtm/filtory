import { AlertCircle } from "lucide-react"
import styles from "@/styles/App.module.css"

export function MyReportEmpty() {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <AlertCircle className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>신고 내역이 없어요</h2>
      <p className={styles.bodyText}>광고성 리뷰나 잘못된 병원 정보를 발견하면 신고 내역이 이곳에 표시돼요.</p>
    </section>
  )
}
