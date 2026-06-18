import Link from "next/link"
import { Bookmark } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function SavedHospitalEmpty() {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconPeach}`}>
        <Bookmark className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>아직 저장한 병원이 없어요</h2>
      <p className={styles.bodyText}>분석 결과에서 관심 병원을 저장하면 나중에 다시 확인할 수 있어요.</p>
      <Link href={ROUTES.ANALYZE} className={styles.primaryButton}>
        분석 시작하기
      </Link>
    </section>
  )
}
