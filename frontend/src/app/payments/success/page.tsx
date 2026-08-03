"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMembership } from "@/context/MembershipContext"
import { paymentFeatureEnabled, paymentService } from "@/services/paymentService"
import { completePaymentCallback } from "@/lib/paymentFlow"
import styles from "@/styles/App.module.css"

type PaymentState = "processing" | "checking" | "invalid"

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshEntitlement } = useMembership()
  const startedRef = useRef(false)
  const callbackInFlightRef = useRef(false)
  const [state, setState] = useState<PaymentState>("processing")
  const [isRunning, setIsRunning] = useState(false)

  const complete = useCallback(async () => {
    const authKey = searchParams.get("authKey")
    const customerKey = searchParams.get("customerKey")
    if (!paymentFeatureEnabled || !authKey || !customerKey) { setState("invalid"); return }
    if (callbackInFlightRef.current) return
    callbackInFlightRef.current = true
    setIsRunning(true)
    try {
      await completePaymentCallback(paymentService, authKey, customerKey, refreshEntitlement)
      router.replace("/mypage/membership?payment=success")
    } catch {
      // 응답 유실 가능성이 있으므로 새 카드 등록 대신 같은 서버 거래를 재조회한다.
      setState("checking")
    } finally {
      callbackInFlightRef.current = false
      setIsRunning(false)
    }
  }, [refreshEntitlement, router, searchParams])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void complete()
  }, [complete])

  return <main className={styles.paymentCallbackPage}>
    <section>
      <p className={styles.membershipEyebrow}>FILTORY PLUS</p>
      <h1>{state === "processing" ? "결제를 완료하고 있어요" : state === "checking" ? "결제 상태 확인 중" : "결제 정보를 확인할 수 없어요"}</h1>
      <p>{state === "checking" ? "결제 응답이 늦어지고 있어요. 새로 결제하지 말고 상태를 다시 확인해 주세요." : state === "invalid" ? "안전한 결제 정보가 없어 처리를 중단했어요." : "창을 닫지 말고 잠시만 기다려 주세요."}</p>
      {state === "checking" && <button type="button" className={styles.primaryButton} disabled={isRunning} onClick={() => void complete()}>{isRunning ? "확인 중…" : "결제 상태 다시 확인"}</button>}
      {state === "invalid" && <button type="button" className={styles.secondaryButton} onClick={() => router.replace("/mypage/membership")}>이용 관리로 돌아가기</button>}
    </section>
  </main>
}

export default function PaymentSuccessPage() {
  return <Suspense fallback={<main className={styles.paymentCallbackPage}>결제 상태를 확인하고 있어요.</main>}><PaymentSuccessContent /></Suspense>
}
