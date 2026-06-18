import styles from "@/styles/App.module.css"

export function HeroSection() {
  return (
    <section className={styles.accentCard}>
      <h1 className={styles.titleLg}>Filtory</h1>
      <p className={styles.bodyText}>AI로 병원 리뷰의 신뢰도와 광고성 가능성을 확인합니다.</p>
    </section>
  )
}
