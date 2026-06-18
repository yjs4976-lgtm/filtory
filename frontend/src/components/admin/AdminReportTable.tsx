import styles from "@/styles/App.module.css"

export function AdminReportTable() {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>신고/의심 리뷰 관리</h2>
      <p className={styles.mutedText}>신고된 리뷰와 의심 리뷰를 검토하는 영역입니다.</p>
    </section>
  )
}
