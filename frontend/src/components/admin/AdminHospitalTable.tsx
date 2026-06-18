import styles from "@/styles/App.module.css"

export function AdminHospitalTable() {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>병원 정보 관리</h2>
      <p className={styles.mutedText}>병원 기본 정보와 링크를 관리하는 영역입니다.</p>
    </section>
  )
}
