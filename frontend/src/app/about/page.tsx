"use client"

import Link from "next/link"
import { Bot, ListChecks, SearchCheck, ShieldCheck, Sparkles } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { SectionPager } from "@/components/common/SectionPager"
import { useLanguage } from "@/context/LanguageContext"
import { TRUST_LEVEL_STANDARDS } from "@/lib/score"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export default function AboutPage() {
  const { t } = useLanguage()
  const featureItems = [
    { title: t.about.features.reviewTrust, description: t.about.features.reviewTrustDesc, icon: ShieldCheck },
    { title: t.about.features.adDetection, description: t.about.features.adDetectionDesc, icon: SearchCheck },
    { title: t.about.features.hospitalReviews, description: t.about.features.hospitalReviewsDesc, icon: ListChecks },
    { title: t.about.features.history, description: t.about.features.historyDesc, icon: Sparkles },
    { title: t.about.features.chatbot, description: t.about.features.chatbotDesc, icon: Bot },
  ]

  const sections = [
    {
      id: "intro",
      content: (
        <div className={styles.stackSm}>
          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.about.whyTitle}</h2>
            <p className={styles.bodyText}>{t.about.whyDescription}</p>
          </section>
        </div>
      ),
    },
    {
      id: "features",
      content: (
        <section className={styles.stackSm}>
          <h2 className={styles.titleMd}>{t.about.featuresTitle}</h2>
          <div className={styles.featureGrid}>
            {featureItems.map(({ title, description, icon: Icon }) => (
              <article key={title} className={styles.featureCard}>
                <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
                  <Icon className={styles.iconSm} />
                </span>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: "trust",
      content: (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <h2 className={styles.titleMd}>{t.about.trustTitle}</h2>
          <div className={styles.trustGuideGrid}>
            {TRUST_LEVEL_STANDARDS.map((level) => (
              <div key={level.key} className={styles.trustGuideItem}>
                <span className={styles.trustShield} style={{ backgroundColor: level.softColor, color: level.color }}>
                  <ShieldCheck className={styles.iconSm} />
                </span>
                <span className={styles.trustGuideText}>
                  <strong>{t.trustLevels[level.key]}</strong>
                  <small>
                    {level.min}-{level.max}
                    {t.common.pointsSuffix} · {t.trustLevelDescriptions[level.key]}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: "steps",
      content: (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <h2 className={styles.titleMd}>{t.about.howTitle}</h2>
          <ol className={styles.compactList}>
            {t.about.steps.map((step: string) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link className={styles.primaryButton} href={ROUTES.ANALYZE}>
            {t.about.cta}
          </Link>
        </section>
      ),
    },
  ]

  return (
    <AppShell title={t.about.title} showBack>
      <section className={`${styles.aboutHero} ${styles.stackSm}`}>
        <p className={styles.memberEyebrow}>APP GUIDE</p>
        <h1>{t.about.title}</h1>
        <p>{t.about.heroDescription}</p>
      </section>

      <SectionPager sections={sections} previousLabel={t.common.previous} nextLabel={t.common.next} />
    </AppShell>
  )
}
