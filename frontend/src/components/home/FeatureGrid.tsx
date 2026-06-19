"use client"

import { CheckCircle2, Globe2, MapPinned, Siren } from "lucide-react"
import { ChatbotIconButton } from "@/components/common/ChatbotIconButton"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function FeatureGrid({ onChatbotOpen }: { onChatbotOpen: () => void }) {
  const { t } = useLanguage()
  const features = [
    { title: t.home.featureReviewTrust, desc: t.home.featureReviewTrustDesc, icon: CheckCircle2, tone: styles.iconMint },
    { title: t.home.featureAdDetection, desc: t.home.featureAdDetectionDesc, icon: Siren, tone: styles.iconPink },
    { title: t.home.featurePlace, desc: t.home.featurePlaceDesc, icon: MapPinned, tone: styles.iconLavender },
    { title: t.home.featureForeigner, desc: t.home.featureForeignerDesc, icon: Globe2, tone: styles.iconPeach },
  ]

  return (
    <section className={styles.stackSm}>
      <div className={styles.rowBetween}>
        <h2 className={styles.titleSm}>{t.home.quickFeatures}</h2>
        <ChatbotIconButton onClick={onChatbotOpen} />
      </div>
      <div className={styles.featureGrid}>
        {features.map(({ title, desc, icon: Icon, tone }) => (
          <article key={title} className={styles.featureCard}>
            <span className={`${styles.iconBoxSmall} ${tone}`}>
              <Icon className={styles.iconSm} />
            </span>
            <strong>{title}</strong>
            <p>{desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
