"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "@/styles/App.module.css"

const CANCELED_CODES = new Set(["PAY_PROCESS_CANCELED", "USER_CANCEL", "PAYMENT_REQUEST_ABORTED"])

function PaymentFailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const code = (params.get("code") ?? "").slice(0, 80)
  // provider message는 화면이나 HTML에 노출하지 않고 길이만 제한해 폐기한다.
  const ignoredMessage = (params.get("message") ?? "").slice(0, 200)
  void ignoredMessage
  const canceled = CANCELED_CODES.has(code)
  return <main className={styles.paymentCallbackPage}><section>
    <p className={styles.membershipEyebrow}>FILTORY PLUS</p>
    <h1>{canceled ? "카드 등록을 취소했어요" : "카드 등록을 완료하지 못했어요"}</h1>
    <p>{canceled ? "결제는 진행되지 않았습니다." : "잠시 후 다시 시도해 주세요. 반복되면 고객지원으로 문의해 주세요."}</p>
    <button type="button" className={styles.primaryButton} onClick={() => router.replace("/mypage/membership")}>다시 시도하기</button>
  </section></main>
}

export default function PaymentFailPage() {
  return <Suspense fallback={<main className={styles.paymentCallbackPage}>결제 결과를 확인하고 있어요.</main>}><PaymentFailContent /></Suspense>
}
