"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserMemoProps {
  userId: number
  initialMemo?: string
}

export function AdminUserMemo({ userId, initialMemo = "" }: AdminUserMemoProps) {
  const { t } = useLanguage()
  const [memo, setMemo] = useState(initialMemo)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    await adminUserService.saveMemo(userId, memo)
    setMessage(t.admin.memoSaved)
  }

  return (
    <section className="soft-card admin-table-card">
      <h2>{t.admin.memoTitle}</h2>
      {message && <p className="form-success">{message}</p>}
      <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} />
      <button type="button" className="small-button" onClick={handleSave}>
        {t.admin.memoSave}
      </button>
    </section>
  )
}
