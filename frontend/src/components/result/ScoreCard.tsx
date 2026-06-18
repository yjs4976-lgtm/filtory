import styles from "@/styles/App.module.css"

export function ScoreCard({ label, score }) {
  return (
    <article className={styles.card}>
      <p className={styles.mutedText}>{label}</p>
      <strong className={styles.titleLg}>{score}</strong>
    </article>
  )
}
