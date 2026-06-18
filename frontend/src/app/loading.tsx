import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import styles from "@/styles/App.module.css"

export default function Loading() {
  return (
    <main className={styles.loadingPage}>
      <LoadingSpinner label="화면을 불러오고 있어요." />
    </main>
  )
}
