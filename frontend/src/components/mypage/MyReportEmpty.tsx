import { AlertCircle } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function MyReportEmpty() {
  const { t } = useLanguage()
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <AlertCircle className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptyReportsTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.emptyReportsDescription}</p>
    </section>
  )
}
