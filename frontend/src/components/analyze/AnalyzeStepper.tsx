import styles from "@/styles/App.module.css"

export function AnalyzeStepper({
  title,
  step,
  total,
  children,
}: {
  title: string
  step: number
  total: number
  children: React.ReactNode
}) {
  return (
    <section className={`${styles.card} ${styles.stackMd}`}>
      <div className={styles.rowBetween}>
        <h1 className={styles.titleMd}>{title}</h1>
        <span className={styles.stepCount}>
          {step}/{total}
        </span>
      </div>
      {children}
    </section>
  )
}
