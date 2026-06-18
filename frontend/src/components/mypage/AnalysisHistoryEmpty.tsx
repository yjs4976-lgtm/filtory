import Link from "next/link"
import { FileSearch } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function AnalysisHistoryEmpty() {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <FileSearch className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>아직 분석 기록이 없어요</h2>
      <p className={styles.bodyText}>첫 리뷰 분석을 시작하면 이곳에 기록이 차곡차곡 쌓여요.</p>
      <Link href={ROUTES.ANALYZE} className={styles.primaryButton}>
        분석 시작하기
      </Link>
    </section>
  )
}
