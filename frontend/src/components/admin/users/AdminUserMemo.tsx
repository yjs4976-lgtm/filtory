"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"

interface AdminUserMemoProps {
  initialMemo?: string
}

export function AdminUserMemo({ initialMemo = "" }: AdminUserMemoProps) {
  const { t } = useLanguage()
  const [memo, setMemo] = useState(initialMemo)

  return (
    <section className="soft-card admin-table-card">
      <h2>{t.admin.memoTitle}</h2>
      <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} />
      <button type="button" className="small-button" disabled title="백엔드 API 연결이 필요한 기능입니다">
        {t.admin.memoSave} · API 연결 필요
      </button>
    </section>
  )
}
