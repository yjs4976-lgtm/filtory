"use client"

import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { useLanguage } from "@/context/LanguageContext"

export function LoginRequiredPanel() {
  const { t } = useLanguage()

  return (
    <LoginRequiredCard
      title={t.mypage.loginRequiredTitle}
      description={t.mypage.loginRequiredDescription}
    />
  )
}
