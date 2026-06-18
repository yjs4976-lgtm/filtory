import Link from "next/link"
import { GitCompareArrows } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface CompareEmptyStateProps {
  categoryLabel: string
}

export function CompareEmptyState({ categoryLabel }: CompareEmptyStateProps) {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <GitCompareArrows className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>저장한 {categoryLabel} 병원이 없어요.</h2>
      <p className={styles.bodyText}>비교하려면 먼저 관심 있는 {categoryLabel} 병원을 저장해주세요.</p>
      <Link href={ROUTES.MYPAGE_SAVED} className={styles.primaryButton}>
        저장한 병원 보기
      </Link>
    </section>
  )
}
