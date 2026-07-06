import type { LoginHistory } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface LoginHistoryListProps {
  items: LoginHistory[]
}

export function LoginHistoryList({ items }: LoginHistoryListProps) {
  const { t } = useLanguage()
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.loginHistory}</h2>
      <div className={styles.recordList}>
        {items.map((item) => (
          <article key={item.id} className={styles.recordButton}>
            <span className={styles.recordBody}>
              <strong className={styles.recordName}>{item.loggedInAt}</strong>
              <span className={styles.recordDate}>
                {item.method} · {item.device}
              </span>
              <span className={styles.recordMeta}>{item.location}</span>
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
