"use client"

import { AuthCard } from "@/components/auth/AuthCard"
import { FindIdForm } from "@/components/auth/FindIdForm"
import { useLanguage } from "@/context/LanguageContext"

export default function FindIdPage() {
  const { t } = useLanguage()

  return (
    <AuthCard
      title={t.auth.findIdTitle}
      description={t.auth.findIdDescription}
    >
      <FindIdForm />
    </AuthCard>
  )
}
