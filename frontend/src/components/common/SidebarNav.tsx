"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  X,
  Headphones,
  History,
  HeartPulse,
  Info,
  LogIn,
  LockKeyhole,
  MessageCircle,
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
  const [accountOpen, setAccountOpen] = useState(() => (
    pathname.startsWith(ROUTES.MYPAGE) ||
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.SIGNUP ||
    pathname === ROUTES.FIND_ID ||
    pathname === ROUTES.FORGOT_PASSWORD
  ))

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (variant !== "drawer" || !isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, variant])

  const serviceItems = [
    { href: ROUTES.ANALYZE, label: t.home.startAnalysis, icon: ClipboardList },
  ]

  const supportItems = [
    { href: ROUTES.ABOUT, label: t.nav.about, icon: Info },
    { href: ROUTES.HELP, label: t.help.title, icon: Headphones },
    ...(isAuthenticated ? [{ href: ROUTES.HELP_MY, label: t.help.list.title, icon: MessageCircle }] : []),
  ]

  const accountItems = isAuthenticated
    ? [
        { href: ROUTES.MYPAGE, label: t.common.mypage, icon: UserRound },
        { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.profileEdit, icon: UserRound },
        { href: ROUTES.MYPAGE_HISTORY, label: t.mypage.menu.history, icon: History },
        { href: ROUTES.MYPAGE_NOTIFICATIONS, label: t.mypage.menu.notificationSettings, icon: Bell },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.password, icon: LockKeyhole },
      ]
    : [
        { href: ROUTES.LOGIN, label: t.auth.loginTitle, icon: LogIn },
        { href: ROUTES.SIGNUP, label: t.auth.signupTitle, icon: UsersRound },
        { href: ROUTES.FIND_ID, label: t.auth.findIdTitle, icon: ClipboardList },
        { href: ROUTES.FORGOT_PASSWORD, label: t.auth.forgotPasswordTitle, icon: ShieldCheck },
      ]

  const adminItems = [
    { href: ROUTES.ADMIN, label: t.admin.dashboard, icon: BarChart3 },
    { href: ROUTES.ADMIN_USERS, label: t.admin.users, icon: UsersRound },
    { href: ROUTES.ADMIN_REVIEWS, label: t.admin.reviews, icon: ClipboardList },
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

      <nav className={styles.sidebarMenu}>
        <section className={styles.sidebarSection}>
          <p className={styles.sidebarSectionLabel}>{t.help.sidebar.service}</p>
          {serviceItems.map(({ href, label, icon: Icon }) => (
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
          <button type="button" className={styles.sidebarLink} onClick={() => { onClose?.(); onChatbotOpen?.() }}>
            <MessageCircle className={styles.iconSm} />
            {t.mypage.openChatbot}
          </button>
        </section>

        <section className={styles.sidebarSection}>
          <p className={styles.sidebarSectionLabel}>{t.help.sidebar.support}</p>
          {supportItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.sidebarLink} ${href === ROUTES.HELP ? (pathname === ROUTES.HELP ? styles.sidebarLinkActive : "") : (isActive(pathname, href) ? styles.sidebarLinkActive : "")}`}
              onClick={onClose}
            >
              <Icon className={styles.iconSm} />
              {label}
            </Link>
          ))}
        </section>

        <section className={styles.sidebarSection}>
          <p className={styles.sidebarSectionLabel}>{t.help.sidebar.account}</p>
          <button
            type="button"
            className={`${styles.sidebarLink} ${styles.sidebarAccountButton} ${accountOpen ? styles.sidebarAccountButtonOpen : ""}`}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <span>
              <UserRound className={styles.iconSm} />
              {t.nav.member}
            </span>
            <ChevronDown className={`${styles.iconXs} ${styles.sidebarAccountChevron}`} />
          </button>
          {accountOpen && (
            <div className={styles.sidebarSubMenu}>
              {accountItems.map(({ href, label, icon: Icon }) => (
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
              {isAuthenticated && (
                <button type="button" className={styles.sidebarLogoutButton} onClick={() => { onClose?.(); logout() }}>
                  {t.mypage.logout}
                </button>
              )}
            </div>
          )}
        </section>

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
