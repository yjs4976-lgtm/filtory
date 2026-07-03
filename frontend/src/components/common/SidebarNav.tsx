"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  X,
  HeartPulse,
  Info,
  LogIn,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { LogoMark } from "./LogoMark"
import styles from "@/styles/App.module.css"

function isActive(pathname: string, href: string) {
  return href === ROUTES.HOME ? pathname === href : pathname.startsWith(href)
}

type SidebarNavProps = {
  variant?: "desktop" | "drawer"
  isOpen?: boolean
  onClose?: () => void
  onChatbotOpen?: () => void
}

export function SidebarNav({ variant = "desktop", isOpen = false, onClose, onChatbotOpen }: SidebarNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { isAdmin, user, isAuthenticated, logout } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const primaryItems = [
    { href: ROUTES.ABOUT, label: t.nav.about, icon: Info },
  ]

  const memberItems = [
    { href: ROUTES.LOGIN, label: t.auth.loginTitle, icon: LogIn },
    { href: ROUTES.SIGNUP, label: t.auth.signupTitle, icon: UsersRound },
    { href: ROUTES.FIND_ID, label: t.auth.findIdTitle, icon: ClipboardList },
    { href: ROUTES.FORGOT_PASSWORD, label: t.auth.forgotPasswordTitle, icon: ShieldCheck },
  ]

  const adminItems = [
    { href: ROUTES.ADMIN, label: t.admin.dashboard, icon: BarChart3 },
    { href: ROUTES.ADMIN_USERS, label: t.admin.users, icon: UsersRound },
    { href: ROUTES.ADMIN_REVIEWS, label: t.admin.reviews, icon: ClipboardList },
    { href: ROUTES.ADMIN_REPORTS, label: t.admin.reports, icon: ShieldCheck },
    { href: ROUTES.ADMIN_HOSPITALS, label: t.admin.hospitals, icon: HeartPulse },
  ]

  if (!mounted) return null

  const menu = (
    <>
      <Link href={ROUTES.HOME} className={styles.sidebarBrand}>
        <span className={styles.sidebarLogo}>
          <LogoMark size={34} className={styles.sidebarLogoImage} />
        </span>
        <span>Filtory</span>
      </Link>

      <section className={styles.drawerProfileCard}>
        {isAuthenticated && user ? (
          <>
            <span className={styles.drawerAvatar}>{(user.nickname || user.name || "F").slice(0, 1)}</span>
            <div className={styles.drawerProfileText}>
              <strong>{user.nickname || user.name}</strong>
              <span>{user.email}</span>
              <small>{user.analysisCount ?? 0} · {user.savedHospitalCount ?? 0}</small>
            </div>
            <Link href={ROUTES.MYPAGE_PROFILE} className={styles.smallPillButton} onClick={onClose}>{t.mypage.profileEdit}</Link>
          </>
        ) : (
          <>
            <div className={styles.drawerProfileText}><strong>{t.auth.loginTitle}</strong><span>{t.mypage.loginRequiredDescription}</span></div>
            <Link href={ROUTES.LOGIN} className={styles.smallPillButton} onClick={onClose}>{t.common.login}</Link>
          </>
        )}
      </section>

      <section className={styles.drawerQuickActions}>
        <Link href={ROUTES.ANALYZE} className={styles.sidebarLink} onClick={onClose}><ClipboardList className={styles.iconSm} />{t.home.startAnalysis}</Link>
        <Link href={ROUTES.MYPAGE_COMPARE} className={styles.sidebarLink} onClick={onClose}><HeartPulse className={styles.iconSm} />{t.mypage.menu.compare}</Link>
        <button type="button" className={styles.sidebarLink} onClick={() => { onClose?.(); onChatbotOpen?.() }}><ShieldCheck className={styles.iconSm} />{t.mypage.openChatbot}</button>
      </section>

      <nav className={styles.sidebarMenu}>
        {primaryItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.sidebarLink} ${isActive(pathname, href) ? styles.sidebarLinkActive : ""}`}
            onClick={onClose}
          >
            <Icon className={styles.iconSm} />
            {label}
          </Link>
        ))}

        <details className={styles.sidebarGroup} open={pathname === ROUTES.LOGIN || pathname === ROUTES.SIGNUP}>
          <summary>
            <span>
              <UserRound className={styles.iconSm} />
              {t.nav.member}
            </span>
            <ChevronDown className={styles.iconXs} />
          </summary>
          <div className={styles.sidebarSubMenu}>
            {memberItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`${styles.sidebarSubLink} ${isActive(pathname, href) ? styles.sidebarLinkActive : ""}`}
                onClick={onClose}
              >
                <Icon className={styles.iconXs} />
                {label}
              </Link>
            ))}
          </div>
        </details>

        {isAdmin && (
          <details className={styles.sidebarGroup} open={pathname.startsWith(ROUTES.ADMIN)}>
            <summary>
              <span>
                <ShieldCheck className={styles.iconSm} />
                {t.nav.admin}
              </span>
              <ChevronDown className={styles.iconXs} />
            </summary>
            <div className={styles.sidebarSubMenu}>
              {adminItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.sidebarSubLink} ${isActive(pathname, href) ? styles.sidebarLinkActive : ""}`}
                  onClick={onClose}
                >
                  <Icon className={styles.iconXs} />
                  {label}
                </Link>
              ))}
            </div>
          </details>
        )}
      </nav>
      {isAuthenticated && <button type="button" className={styles.secondaryButton} onClick={() => { onClose?.(); logout() }}>{t.mypage.logout}</button>}
    </>
  )

  if (variant === "drawer") {
    return (
      <div className={`${styles.drawerLayer} ${isOpen ? styles.drawerLayerOpen : ""}`} aria-hidden={!isOpen}>
        <button type="button" className={styles.drawerBackdrop} aria-label={t.common.close} onClick={onClose} />
        <aside className={styles.sidebarDrawer} aria-label={t.nav.sidebarLabel}>
          <div className={styles.drawerHeader}>
            <span className={styles.memberEyebrow}>MENU</span>
            <button type="button" className={styles.iconButton} aria-label={t.common.close} onClick={onClose}>
              <X className={styles.iconMd} />
            </button>
          </div>
          {menu}
        </aside>
      </div>
    )
  }

  return (
    <aside className={styles.sidebarNav} aria-label={t.nav.sidebarLabel}>
      {menu}
    </aside>
  )
}
