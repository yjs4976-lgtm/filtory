import Link from "next/link"
import type { NotificationItem } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface NotificationCardProps {
  item: NotificationItem
}

export function NotificationCard({ item }: NotificationCardProps) {
  const content = (
    <>
      <span className={item.isRead ? styles.neutralPill : styles.connectedPill}>
        {item.isRead ? "읽음" : "안 읽음"}
      </span>
      <span className={styles.recordBody}>
        <strong className={styles.recordName}>{item.title}</strong>
        <span className={styles.recordDate}>{item.message}</span>
        <span className={styles.recordMeta}>{item.createdAt}</span>
      </span>
    </>
  )

  if (item.link) {
    return (
      <Link href={item.link} className={styles.recordButton}>
        {content}
      </Link>
    )
  }

  return <article className={styles.recordButton}>{content}</article>
}
