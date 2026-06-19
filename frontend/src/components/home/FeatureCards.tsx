"use client"

import { FileSearch, Globe2, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function FeatureCards() {
  const { t } = useLanguage()
  const features = [
    { icon: ShieldCheck, title: t.home.featureReviewTrust, description: t.home.featureReviewTrustDesc },
    { icon: FileSearch, title: t.home.featurePlace, description: t.home.featurePlaceDesc },
    { icon: Globe2, title: t.home.featureForeignerAccess, description: t.home.featureForeignerAccessDesc },
  ]

  return (
    <section className={styles.stackSm}>
      {features.map(({ icon: Icon, title, description }) => (
        <article key={title} className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <Icon className={styles.iconSm} />
            <h2 className={styles.titleSm}>{title}</h2>
          </div>
          <p className={styles.mutedText}>{description}</p>
        </article>
      ))}
    </section>
  )
}
