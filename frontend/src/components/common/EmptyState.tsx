import Link from "next/link"
import { Sparkles } from "lucide-react"
import styles from "@/styles/App.module.css"

export function EmptyState({ title, description = "", actionHref = "", actionLabel = "" }) {
  return (
    <section className={`${styles.emptyCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBox} ${styles.iconMint}`}>
        <Sparkles className={styles.iconMd} />
      </span>
      <h2 className={styles.titleMd}>{title}</h2>
      {description && <p className={styles.mutedText}>{description}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={styles.primaryButton}>
          {actionLabel}
        </Link>
      )}
    </section>
  )
}
