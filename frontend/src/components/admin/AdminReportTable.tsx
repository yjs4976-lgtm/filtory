import styles from "@/styles/App.module.css"

export function AdminReportTable() {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>검토/의심 리뷰 관리</h2>
      <p className={styles.mutedText}>검토 요청 리뷰와 의심 리뷰를 확인하는 영역입니다.</p>
    </section>
  )
}
