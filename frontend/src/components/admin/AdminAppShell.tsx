"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, Bell, CircleHelp, FileQuestion, Gift, HeartPulse, History, LayoutDashboard, Menu, Settings, ShieldAlert, Users, WalletCards, X } from "lucide-react"
import { LogoMark } from "@/components/common/LogoMark"
import { ROUTES } from "@/lib/routes"
import { useAuth } from "@/hooks/useAuth"
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher"

const mobileNav = [
  [ROUTES.ADMIN,"대시보드",LayoutDashboard], [ROUTES.ADMIN_USERS,"사용자 관리",Users], [ROUTES.ADMIN_USAGE,"분석 사용량",BarChart3],
  [ROUTES.ADMIN_MEMBERSHIPS,"멤버십 관리",WalletCards], [ROUTES.ADMIN_AD_REWARDS,"광고 보상 내역",Gift], [ROUTES.ADMIN_SETTINGS,"서비스 설정",Settings],
] as const
const navGroups = [
  ["개요", [[ROUTES.ADMIN,"대시보드",LayoutDashboard]]],
  ["분석 운영", [[ROUTES.ADMIN_ANALYSES,"분석 결과 관리",Activity],[ROUTES.ADMIN_ERRORS,"분석 오류 관리",ShieldAlert],[ROUTES.ADMIN_USAGE,"분석 사용량",BarChart3]]],
  ["사용자 운영", [[ROUTES.ADMIN_USERS,"사용자 관리",Users],[ROUTES.ADMIN_SUPPORT,"문의·신고 관리",CircleHelp]]],
  ["이용 정책", [[ROUTES.ADMIN_MEMBERSHIPS,"멤버십 관리",WalletCards],[ROUTES.ADMIN_AD_REWARDS,"광고 보상 내역",Gift]]],
  ["콘텐츠", [[ROUTES.ADMIN_NOTICES,"공지사항·FAQ",FileQuestion]]],
  ["시스템", [[ROUTES.ADMIN_SETTINGS,"서비스 설정",Settings],[ROUTES.ADMIN_SYSTEM,"시스템 상태",HeartPulse],[ROUTES.ADMIN_AUDIT_LOGS,"관리자 활동 기록",History]]],
] as const

export function AdminAppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const { user, isAdmin, isLoading, logout } = useAuth()
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButtonRef.current?.focus() }
      if (event.key !== "Tab" || !sidebarRef.current) return
      const items=[...sidebarRef.current.querySelectorAll<HTMLElement>("a,button")]
      if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus()}
      if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus()}
    }
    window.addEventListener("keydown",keydown)
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",keydown)}
  },[open])
  if (isLoading || !isAdmin) return <main className="admin-auth-loading">{children}</main>
  return <div className="admin-workspace">
    {open && <button type="button" className="admin-sidebar-backdrop" onClick={() => setOpen(false)} aria-label="관리자 메뉴 닫기" />}
    <aside ref={sidebarRef} className={`admin-sidebar ${open ? "is-open" : ""}`} aria-label="관리자 메뉴">
      <div className="admin-sidebar-brand"><LogoMark size={34} /><strong>Filtory</strong><span>ADMIN</span><button type="button" onClick={() => setOpen(false)} aria-label="관리자 메뉴 닫기"><X /></button></div>
      <nav>{navGroups.map(([group,items])=><section key={group}><h2>{group}</h2>{items.map(([href,label,Icon]) => { const active = href === ROUTES.ADMIN ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><Icon />{label}</Link> })}</section>)}</nav>
      <div className="admin-sidebar-footer"><strong>{user?.nickname || user?.name || "관리자"}</strong><span>서비스 운영자</span><WorkspaceSwitcher current="ADMIN" /><button type="button" onClick={() => void logout(ROUTES.LOGIN)}>로그아웃</button></div>
    </aside>
    <div className="admin-workspace-main">
      <header className="admin-workspace-header"><div><button ref={menuButtonRef} type="button" onClick={() => setOpen(true)} aria-label="관리자 메뉴 열기"><Menu /></button><span className="admin-mobile-brand"><LogoMark size={30} /><strong>Filtory</strong><em>ADMIN</em></span><h1>{title}</h1></div><div><button type="button" aria-label="관리자 알림"><Bell /></button><span className="admin-profile">관리자</span><WorkspaceSwitcher current="ADMIN" compact /></div></header>
      <main className="admin-content">{children}</main>
      <nav className="admin-mobile-nav" aria-label="모바일 관리자 메뉴">
        {mobileNav.slice(0, 5).map(([href, label, Icon]) => {
          const active = href === ROUTES.ADMIN ? pathname === href : pathname.startsWith(href)
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><span><Icon /></span><small>{label.replace(" 관리", "").replace(" 내역", "")}</small></Link>
        })}
      </nav>
    </div>
  </div>
}
