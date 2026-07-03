import Link from "next/link"
import { ChevronRight, FileText, KeyRound, ShieldCheck, UserPen } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function MyPageMenuList() {
  const { t } = useLanguage()
  const menuItems = [
    { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.menu.profile, icon: UserPen },
    { href: ROUTES.HISTORY, label: t.mypage.menu.history, icon: FileText },
    { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.menu.password, icon: KeyRound },
    { href: ROUTES.MYPAGE_WITHDRAWAL, label: t.mypage.withdrawal, icon: ShieldCheck, danger: true },
  ]

  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>{t.mypage.accountManagement}</h2>
      <div className={styles.recordList}>
        {menuItems.map(({ href, label, icon: Icon, danger }) => (
          <Link key={label} href={href} className={styles.recordButton}>
            <span className={`${styles.iconBoxSmall} ${danger ? styles.iconPink : styles.iconLavender}`}>
              <Icon className={styles.iconMd} />
            </span>
            <span className={styles.recordBody}>
              <span className={styles.recordName}>{label}</span>
            </span>
            <ChevronRight className={styles.iconSm} />
          </Link>
        ))}
      </div>
    </section>
  )
}
