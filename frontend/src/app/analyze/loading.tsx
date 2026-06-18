import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import styles from "@/styles/App.module.css"

export default function AnalyzeLoading() {
  return (
    <main className={styles.loadingPage}>
      <LoadingSpinner label="분석 화면을 준비하고 있어요." />
    </main>
  )
}
