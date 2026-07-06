"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function DangerZone() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.dangerZoneCard} ${styles.stackSm}`}>
      <div className={styles.row}>
        <span className={`${styles.iconBoxSmall} ${styles.iconPink}`}>
          <AlertTriangle className={styles.iconSm} />
        </span>
        <h2 className={styles.titleSm}>{t.mypage.dangerZone}</h2>
      </div>
      <div>
        <h3 className={styles.titleMd}>{t.mypage.withdrawal}</h3>
        <p className={styles.bodyText}>{t.mypage.withdrawalDescription}</p>
      </div>
      <Link href={ROUTES.MYPAGE_WITHDRAWAL} className={styles.dangerButton}>
        {t.mypage.withdrawalButton}
      </Link>
    </section>
  )
}
