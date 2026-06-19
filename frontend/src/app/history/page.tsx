"use client"

import { AppShell } from "@/components/common/AppShell"
import { HistoryList } from "@/components/history/HistoryList"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function HistoryPage() {
  const { t } = useLanguage()
  return (
    <AppShell title={t.history.title} showBack>
      <section className={`${styles.card} ${styles.stackSm}`}>
        <p className={styles.memberEyebrow}>HISTORY</p>
        <h2 className={styles.titleMd}>{t.history.title}</h2>
        <p className={styles.bodyText}>{t.history.emptyDescription}</p>
      </section>
      <HistoryList />
    </AppShell>
  )
}
