"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, LayoutDashboard, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import type { Workspace } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function WorkspaceSwitcher({ current, compact = false }: { current: Workspace; compact?: boolean }) {
  const { user, isAdmin, switchWorkspace, logout } = useAuth()
  const { language } = useLanguage()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ko = language === "ko"
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape) }
  }, [open])
  if (!isAdmin) return null
  const target: Workspace = current === "ADMIN" ? "USER" : "ADMIN"
  const choose = () => {
    if (!switchWorkspace(target)) return
    setOpen(false)
    showToast({ title: target === "ADMIN" ? (ko ? "관리자 센터로 전환했어요." : "Switched to Admin Center.") : (ko ? "사용자 화면으로 전환했어요." : "Switched to the user app."), tone: "success" })
  }
  return <div className={`${styles.workspaceSwitcher} ${compact ? styles.workspaceSwitcherCompact : ""}`} ref={rootRef}>
    <button type="button" className={styles.workspaceSwitcherTrigger} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <UserRound />{!compact && <span>{user?.nickname || user?.name || (ko ? "관리자" : "Admin")}</span>}
    </button>
    {open && <div className={styles.workspaceMenu} role="menu">
      <div className={styles.workspaceAccount}><strong>{user?.nickname || user?.name}</strong><span>{ko ? "관리자 계정" : "Administrator account"}</span></div>
      <div className={styles.workspaceCurrent}><small>{ko ? "현재 화면" : "Current workspace"}</small><strong>{current === "ADMIN" ? (ko ? "관리자 센터" : "Admin Center") : (ko ? "사용자 화면" : "User app")}</strong></div>
      <small className={styles.workspaceMenuLabel}>{ko ? "화면 전환" : "Switch workspace"}</small>
      <button type="button" role="menuitem" className={styles.workspaceMenuAction} onClick={choose}>{target === "ADMIN" ? <LayoutDashboard /> : <UserRound />}<span>{target === "ADMIN" ? (ko ? "관리자 센터" : "Admin Center") : (ko ? "사용자 화면" : "User app")}</span><ChevronRight /></button>
      {current === "USER" && <div className={styles.workspaceMenuFooter}><Link href={ROUTES.MYPAGE_PROFILE} onClick={() => setOpen(false)}>{ko ? "내 프로필" : "My profile"}</Link><button type="button" onClick={() => void logout()}>{ko ? "로그아웃" : "Log out"}</button></div>}
    </div>}
  </div>
}
