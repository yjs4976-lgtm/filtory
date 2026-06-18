import { Bell } from "lucide-react"
import styles from "@/styles/App.module.css"

export function NotificationEmpty() {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
        <Bell className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>알림이 없어요</h2>
      <p className={styles.bodyText}>분석 완료, 신고 처리, 계정 보안 알림이 이곳에 표시돼요.</p>
    </section>
  )
}
