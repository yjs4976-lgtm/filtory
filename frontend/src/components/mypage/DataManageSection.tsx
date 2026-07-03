"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { userDataService } from "@/services/userDataService"
import { DataDeleteConfirmModal } from "./DataDeleteConfirmModal"
import styles from "@/styles/App.module.css"

type DeleteTarget = "analysis" | "saved" | "recent"

export function DataManageSection() {
  const { t } = useLanguage()
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState<DeleteTarget | null>(null)
  const targetLabels: Record<DeleteTarget, string> = {
    analysis: t.mypage.deleteAnalysisData,
    saved: t.mypage.deleteSavedData,
    recent: t.mypage.deleteRecentData,
  }

  const handleDownload = async () => {
    await userDataService.downloadMyData()
    setMessage(t.mypage.dataDownloadReady)
  }

  const handleConfirmDelete = async () => {
    if (!target) return
    if (target === "analysis") await userDataService.deleteAnalysisHistory()
    if (target === "saved") await userDataService.deleteSavedHospitals()
    if (target === "recent") await userDataService.deleteRecentHospitals()
    setMessage(t.mypage.dataRequestDone.replace("{label}", targetLabels[target]))
    setTarget(null)
  }

  return (
    <section className={styles.stackSm}>
      {message && <p className={styles.formSuccess}>{message}</p>}
      <article className={`${styles.card} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>{t.mypage.dataPrivacyTitle}</h2>
        <p className={styles.bodyText}>{t.mypage.dataPrivacyDescription}</p>
        <button type="button" className={styles.primaryButton} onClick={handleDownload}>
          {t.mypage.downloadMyData}
        </button>
      </article>
      <article className={`${styles.dangerZoneCard} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>{t.mypage.deleteManagement}</h2>
        {(Object.keys(targetLabels) as DeleteTarget[]).map((key) => (
          <button key={key} type="button" className={styles.dangerButton} onClick={() => setTarget(key)}>
            {targetLabels[key]}
          </button>
        ))}
      </article>
      <DataDeleteConfirmModal
        open={target !== null}
        title={target ? targetLabels[target] : ""}
        onClose={() => setTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}
