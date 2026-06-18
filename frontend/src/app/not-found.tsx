import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export default function NotFound() {
  return (
    <main className={`${styles.main} ${styles.stackSm}`}>
      <h1 className={styles.titleLg}>페이지를 찾을 수 없어요</h1>
      <p className={styles.bodyText}>주소를 확인하거나 홈으로 돌아가 주세요.</p>
      <Link className={styles.primaryButton} href={ROUTES.HOME}>홈으로 이동</Link>
    </main>
  )
}
