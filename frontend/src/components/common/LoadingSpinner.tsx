import { Loader2 } from "lucide-react"
import styles from "@/styles/App.module.css"

export function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className={styles.centerRow}>
      <Loader2 className={`${styles.iconMd} ${styles.spin}`} />
      <span className={styles.mutedText}>{label}</span>
    </div>
  )
}
