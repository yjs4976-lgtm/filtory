"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SavedHospitalEmpty } from "@/components/mypage/SavedHospitalEmpty"
import { SavedHospitalList } from "@/components/mypage/SavedHospitalList"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { SavedHospital } from "@/lib/types"
import { savedHospitalService } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

export default function MySavedHospitalsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [hospitals, setHospitals] = useState<SavedHospital[]>([])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    savedHospitalService.getSavedHospitals(user?.id).then((items) => {
      if (!alive) return
      setHospitals(items)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [user?.id])

  const handleAddToCompare = async (id: number) => {
    await savedHospitalService.addToCompare(id)
    setMessage(t.mypage.addedToCompare)
  }

  const handleUnsave = async (id: number) => {
    const ok = window.confirm(t.mypage.unsaveConfirm)
    if (!ok) return
    await savedHospitalService.unsaveHospital(user?.id, id)
    setHospitals((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.savedPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.savedPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.savedPageDescription}</p>
        </section>
        {message && <p className={styles.formSuccess}>{message}</p>}
        {isLoading ? (
          <LoadingSpinner label={t.mypage.loadingSavedHospitals} />
        ) : hospitals.length === 0 ? (
          <SavedHospitalEmpty />
        ) : (
          <SavedHospitalList
            hospitals={hospitals}
            preview={false}
            onAddToCompare={handleAddToCompare}
            onUnsave={handleUnsave}
          />
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
