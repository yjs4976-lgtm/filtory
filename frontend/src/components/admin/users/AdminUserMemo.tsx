"use client"

import { useState } from "react"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserMemoProps {
  userId: number
  initialMemo?: string
}

export function AdminUserMemo({ userId, initialMemo = "" }: AdminUserMemoProps) {
  const [memo, setMemo] = useState(initialMemo)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    await adminUserService.saveMemo(userId, memo)
    setMessage("관리자 메모가 저장되었어요.")
  }

  return (
    <section className="soft-card admin-table-card">
      <h2>관리자 메모</h2>
      {message && <p className="form-success">{message}</p>}
      <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} />
      <button type="button" className="small-button" onClick={handleSave}>
        메모 저장
      </button>
    </section>
  )
}
