"use client"

import { useState } from "react"
import { BottomNav } from "@/components/common/BottomNav"
import { ChatbotIconButton } from "@/components/common/ChatbotIconButton"
import { Header } from "@/components/common/Header"
import { ChatbotModal } from "@/components/chatbot/ChatbotModal"
import { FeatureGrid } from "@/components/home/FeatureGrid"
import { HomeHero } from "@/components/home/HomeHero"
import { RecentAnalysisSection } from "@/components/home/RecentAnalysisSection"
import { TrustTipCard } from "@/components/home/TrustTipCard"
import { PartneredInsight } from "@/components/ads/PartneredInsight"
import { useMembership } from "@/context/MembershipContext"
import { getActiveSponsoredInsight } from "@/data/sponsoredInsights"
import { subscriptionPlans } from "@/data/subscriptionPlans"
import styles from "@/styles/App.module.css"

export default function HomePage() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const { membershipType } = useMembership()

  return (
    <div className={styles.page}>
      <Header showBrand showBell />

      <main className={`${styles.main} ${styles.stackMd}`}>
        <HomeHero />
        <FeatureGrid />
        <RecentAnalysisSection />
        <PartneredInsight insight={getActiveSponsoredInsight("home")} showSponsoredContent={subscriptionPlans[membershipType].showPartneredInsight} />
        <TrustTipCard />
      </main>

      <div className={styles.homeFloatingChatbot}>
        <ChatbotIconButton onClick={() => setIsChatbotOpen(true)} expanded={isChatbotOpen} />
      </div>

      <ChatbotModal open={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

      <BottomNav />
    </div>
  )
}
