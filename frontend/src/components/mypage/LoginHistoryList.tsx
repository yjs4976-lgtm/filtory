import type { LoginHistory } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface LoginHistoryListProps {
  items: LoginHistory[]
}

export function LoginHistoryList({ items }: LoginHistoryListProps) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>로그인 기록</h2>
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
