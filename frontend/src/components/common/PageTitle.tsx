import styles from "@/styles/App.module.css"

export function PageTitle({ title, description = "" }) {
  return (
    <section className={styles.stackSm}>
      <h1 className={styles.titleLg}>{title}</h1>
      {description && <p className={styles.bodyText}>{description}</p>}
    </section>
  )
}
