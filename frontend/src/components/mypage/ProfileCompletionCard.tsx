"use client"

import Link from "next/link"
import { Check, CircleDashed } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { calculateProfileCompletion } from "@/lib/profileCompletion"
import type { User } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface ProfileCompletionCardProps {
  user: User | null
}

export function ProfileCompletionCard({ user }: ProfileCompletionCardProps) {
  const { t } = useLanguage()
  const completion = calculateProfileCompletion(user)

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <h2 className={styles.titleSm}>{t.mypage.profileCompletion}</h2>
        <strong className={styles.progressValue}>{completion.percent}%</strong>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${completion.percent}%` }} />
      </div>
      <div className={styles.profileChecklistGrid}>
        <div className={styles.stackSm}>
          <p className={styles.miniSectionTitle}>{t.mypage.completedItems}</p>
          {completion.completedItems.map((item) => (
            <span key={item.key} className={styles.checkListItem}>
              <Check className={styles.iconSm} />
              {t.mypage.completionItems[item.key]}
            </span>
          ))}
        </div>
        <div className={styles.stackSm}>
          <p className={styles.miniSectionTitle}>{t.mypage.missingItems}</p>
          {completion.missingItems.length ? (
            completion.missingItems.map((item) => (
              <Link key={item.key} href={item.href} className={styles.missingListItem}>
                <CircleDashed className={styles.iconSm} />
                {t.mypage.completionItems[item.key]}
              </Link>
            ))
          ) : (
            <span className={styles.checkListItem}>
              <Check className={styles.iconSm} />
              100%
            </span>
          )}
        </div>
      </div>
      <Link href={ROUTES.MYPAGE_PROFILE} className={styles.secondaryButton}>
        {t.mypage.profileEdit}
      </Link>
    </section>
  )
}
