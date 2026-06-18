"use client"

import { useState } from "react"
import { userDataService } from "@/services/userDataService"
import { DataDeleteConfirmModal } from "./DataDeleteConfirmModal"
import styles from "@/styles/App.module.css"

type DeleteTarget = "analysis" | "saved" | "recent"

const targetLabels: Record<DeleteTarget, string> = {
  analysis: "분석 기록 전체 삭제",
  saved: "저장한 병원 전체 삭제",
  recent: "최근 본 병원 기록 삭제",
}

export function DataManageSection() {
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  const handleDownload = async () => {
    const result = await userDataService.downloadMyData()
    setMessage(result.message)
  }

  const handleConfirmDelete = async () => {
    if (!target) return
    if (target === "analysis") await userDataService.deleteAnalysisHistory()
    if (target === "saved") await userDataService.deleteSavedHospitals()
    if (target === "recent") await userDataService.deleteRecentHospitals()
    setMessage(`${targetLabels[target]} 요청이 완료되었어요.`)
    setTarget(null)
  }

  return (
    <section className={styles.stackSm}>
      {message && <p className={styles.formSuccess}>{message}</p>}
      <article className={`${styles.card} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>개인정보 처리 안내</h2>
        <p className={styles.bodyText}>Filtory에서 저장된 내 활동 데이터를 확인하고 관리할 수 있어요.</p>
        <button type="button" className={styles.primaryButton} onClick={handleDownload}>
          내 데이터 다운로드
        </button>
      </article>
      <article className={`${styles.dangerZoneCard} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>삭제 관리</h2>
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
