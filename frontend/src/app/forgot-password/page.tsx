"use client"

import { AuthCard } from "@/components/auth/AuthCard"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { useLanguage } from "@/context/LanguageContext"

export default function ForgotPasswordPage() {
  const { t } = useLanguage()

  return (
    <AuthCard
      title={t.auth.forgotPasswordTitle}
      description={t.auth.forgotPasswordDescription}
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
