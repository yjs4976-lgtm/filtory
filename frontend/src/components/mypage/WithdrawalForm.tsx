"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { STORAGE_KEYS } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { memberService } from "@/services/memberService"
import styles from "@/styles/App.module.css"

export function WithdrawalForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canWithdraw = password.length > 0 && checked && !isSubmitting

  const handleWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!password || !checked) {
      setError("비밀번호 입력과 탈퇴 동의가 필요합니다.")
      return
    }

    const ok = window.confirm("정말 회원 탈퇴하시겠어요? 이 작업은 되돌릴 수 없습니다.")
    if (!ok) return

    try {
      setIsSubmitting(true)
      await memberService.withdrawUser(password)
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER)
      alert("회원 탈퇴가 완료되었습니다.")
      router.push(ROUTES.HOME)
    } catch (error) {
      setError(error instanceof Error ? error.message : "회원 탈퇴 실패")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleWithdrawal}>
      <div className={`${styles.softCard} ${styles.stackSm}`}>
        <strong>회원 탈퇴 전 확인해주세요.</strong>
        <p className={styles.mutedText}>탈퇴하면 분석 기록과 계정 정보가 삭제되거나 비활성화될 수 있습니다.</p>
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="withdraw-password">
        비밀번호 확인
        <input
          id="withdraw-password"
          className={styles.input}
          type="password"
          placeholder="계정 비밀번호"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className={styles.row}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        탈퇴 안내를 확인했습니다.
      </label>

      <button className={styles.dangerButton} type="submit" disabled={!canWithdraw}>
        {isSubmitting ? "처리 중..." : "회원 탈퇴"}
      </button>
    </form>
  )
}
