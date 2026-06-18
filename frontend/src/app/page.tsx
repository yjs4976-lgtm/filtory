"use client"

import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { AdBanner } from "@/components/home/AdBanner"
import { FeatureGrid } from "@/components/home/FeatureGrid"
import { HomeHero } from "@/components/home/HomeHero"
import { RecentAnalysisSection } from "@/components/home/RecentAnalysisSection"
import { TrustTipCard } from "@/components/home/TrustTipCard"
import styles from "@/styles/App.module.css"

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Header showBrand showBell />

      <main className={`${styles.main} ${styles.stack}`}>
        <AdBanner />
        <HomeHero />
        <FeatureGrid />
        <RecentAnalysisSection />
        <TrustTipCard />
      </main>

      <BottomNav />
    </div>
  )
}
