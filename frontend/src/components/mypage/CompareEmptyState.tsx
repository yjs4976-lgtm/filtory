import Link from "next/link"
import { GitCompareArrows } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function CompareEmptyState() {
  const { t } = useLanguage()
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <GitCompareArrows className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptyCompareTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.emptyCompareDescription}</p>
      <Link href={ROUTES.MYPAGE_SAVED} className={styles.primaryButton}>
        {t.mypage.emptyCompareAction}
      </Link>
    </section>
  )
}
