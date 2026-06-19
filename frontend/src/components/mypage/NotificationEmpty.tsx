import { Bell } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function NotificationEmpty() {
  const { t } = useLanguage()
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <Bell className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.emptyNotificationsTitle}</h2>
      <p className={styles.bodyText}>{t.mypage.emptyNotificationsDescription}</p>
    </section>
  )
}
