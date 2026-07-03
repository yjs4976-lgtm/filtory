"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export default function NotFound() {
  const { t } = useLanguage()

  return (
    <main className={`${styles.main} ${styles.stackSm}`}>
      <h1 className={styles.titleLg}>{t.common.notFoundTitle}</h1>
      <p className={styles.bodyText}>{t.common.notFoundDescription}</p>
      <Link className={styles.primaryButton} href={ROUTES.HOME}>{t.common.goHome}</Link>
    </main>
  )
}
