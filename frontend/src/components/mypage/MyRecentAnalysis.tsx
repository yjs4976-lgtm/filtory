import { HistoryList } from "@/components/history/HistoryList"
import styles from "@/styles/App.module.css"
import { useLanguage } from "@/context/LanguageContext"

export function MyRecentAnalysis() {
  const { t } = useLanguage()
  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>{t.mypage.menu.history}</h2>
      <HistoryList compact />
    </section>
  )
}
