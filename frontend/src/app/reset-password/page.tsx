"use client"

import { Suspense } from "react"
import { AuthCard } from "@/components/auth/AuthCard"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { useLanguage } from "@/context/LanguageContext"

export default function ResetPasswordPage() {
  const { t } = useLanguage()

  return (
    <AuthCard
      title={t.auth.resetPasswordTitle}
      description={t.auth.resetPasswordDescription}
    >
      <Suspense fallback={<p>{t.common.loading}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
