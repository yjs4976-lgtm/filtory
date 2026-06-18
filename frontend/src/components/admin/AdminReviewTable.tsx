import styles from "@/styles/App.module.css"

export function AdminReviewTable() {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>리뷰 분석 관리</h2>
      <p className={styles.mutedText}>분석 요청과 결과 상태를 확인하는 영역입니다.</p>
    </section>
  )
}
