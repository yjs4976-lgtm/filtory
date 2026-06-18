import styles from "@/styles/App.module.css"

export function EmptyState({ title, description = "" }) {
  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{title}</h2>
      {description && <p className={styles.mutedText}>{description}</p>}
    </section>
  )
}
