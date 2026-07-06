"use client"

import { AppShell } from "@/components/common/AppShell"
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice"
import { useLanguage } from "@/context/LanguageContext"

export default function VerifyEmailPage() {
  const { t } = useLanguage()
  return (
    <AppShell title={t.mypage.verifyEmail} showBack>
      <EmailVerificationNotice />
    </AppShell>
  )
}
