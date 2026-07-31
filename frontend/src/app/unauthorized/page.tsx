"use client"

import Link from "next/link"
import { ShieldX } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export default function UnauthorizedPage() {
  const { language } = useLanguage()
  const ko = language === "ko"
  return <AppShell showBrand><section className={styles.unauthorizedCard}>
    <span><ShieldX /></span>
    <h1>{ko ? "접근 권한이 없습니다." : "You do not have access."}</h1>
    <p>{ko ? <>관리자 계정으로 로그인한 경우에만<br />이 페이지를 이용할 수 있어요.</> : <>This page is available only when<br />signed in with an administrator account.</>}</p>
    <Link href={ROUTES.HOME} className={styles.primaryButton}>{ko ? "홈으로 이동" : "Go home"}</Link>
  </section></AppShell>
}
