"use client"

import { Suspense } from "react"
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler"
import { useLanguage } from "@/context/LanguageContext"

export default function AuthCallbackPage() {
  const { t } = useLanguage()

  return (
    <Suspense fallback={<p>{t.auth.socialProcessing}</p>}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
