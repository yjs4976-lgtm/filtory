import { BottomNav } from "./BottomNav"
import { Header } from "./Header"
import styles from "@/styles/App.module.css"

export function AppShell({ children, title = "", showBack = false, showBrand = false, showBell = false }) {
  return (
    <div className={styles.page}>
      <Header title={title} showBack={showBack} showBrand={showBrand} showBell={showBell} />
      <main className={`${styles.main} ${styles.stackMd}`}>{children}</main>
      <BottomNav />
    </div>
  )
}
