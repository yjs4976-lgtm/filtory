"use client"

import Link from "next/link"
import {
  Bell,
  ChevronRight,
  Database,
  FileText,
  GitCompareArrows,
  HeartPulse,
  KeyRound,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPen,
  UsersRound,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { User } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface AccountManageMenuProps {
  user: User | null
}

export function AccountManageMenu({ user }: AccountManageMenuProps) {
  const { t } = useLanguage()
  const menuGroups = [
    {
      title: "내 활동",
      items: [
        { href: ROUTES.MYPAGE_HISTORY, label: "분석 기록", description: "내가 분석한 병원을 다시 확인해요", icon: FileText },
        { href: ROUTES.MYPAGE_SAVED, label: "저장한 병원", description: "관심 병원을 모아봐요", icon: HeartPulse },
        { href: ROUTES.MYPAGE_COMPARE, label: "병원 비교", description: "같은 분야 병원끼리 비교해요", icon: GitCompareArrows },
        { href: ROUTES.MYPAGE_RECENT, label: "최근 본 병원", description: "최근 확인한 병원을 다시 봐요", icon: FileText },
        { href: ROUTES.MYPAGE_REPORTS, label: "내 신고 내역", description: "신고 처리 상태를 확인해요", icon: ShieldCheck },
      ],
    },
    {
      title: "알림",
      items: [
        { href: ROUTES.MYPAGE_NOTIFICATIONS, label: "알림 센터", description: "내 알림을 모아봐요", icon: Bell },
        { href: ROUTES.MYPAGE_SETTINGS, label: "알림 설정", description: "알림 수신 여부를 조정해요", icon: Settings },
      ],
    },
    {
      title: t.mypage.accountManagement,
      items: [
        { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.menu.profile, description: t.mypage.menu.profileDesc, icon: UserPen },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.password, description: t.mypage.menu.passwordDesc, icon: KeyRound },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.social, description: t.mypage.menu.socialDesc, icon: UsersRound },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.security, description: t.mypage.menu.securityDesc, icon: ShieldCheck },
      ],
    },
    {
      title: "개인화",
      items: [
        { href: ROUTES.MYPAGE_INSIGHTS, label: "나의 병원 선택 성향", description: "내 선택 패턴을 확인해요", icon: Sparkles },
        { href: ROUTES.CHATBOT, label: "AI 추천", description: "최근 분석을 챗봇에게 물어봐요", icon: Sparkles },
      ],
    },
    {
      title: "설정",
      items: [
        { href: ROUTES.MYPAGE_SETTINGS, label: "언어·테마 설정", description: "언어와 화면 설정을 관리해요", icon: Settings },
        { href: ROUTES.MYPAGE_DATA, label: "내 데이터 관리", description: "활동 데이터 다운로드와 삭제를 관리해요", icon: Database },
      ],
    },
  ]
  const providers = [
    { key: "google", label: "Google" },
    { key: "naver", label: "Naver" },
    { key: "kakao", label: "Kakao" },
  ] as const

  return (
    <section className={styles.stackSm}>
      {menuGroups.map((group) => (
        <div key={group.title} className={styles.stackSm}>
          <h2 className={styles.titleSm}>{group.title}</h2>
          <div className={styles.recordList}>
            {group.items.map(({ href, label, description, icon: Icon }) => (
              <Link key={`${group.title}-${label}`} href={href} className={styles.recordButton}>
                <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
                  <Icon className={styles.iconMd} />
                </span>
                <span className={styles.recordBody}>
                  <span className={styles.recordName}>{label}</span>
                  <span className={styles.recordDate}>{description}</span>
                </span>
                <ChevronRight className={styles.iconSm} />
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className={`${styles.softCard} ${styles.socialProviderGrid}`}>
        {providers.map((provider) => {
          const connected = Boolean(user?.socialProviders?.[provider.key])
          return (
            <span key={provider.key} className={connected ? styles.connectedPill : styles.neutralPill}>
              {provider.label} {connected ? t.mypage.connected : t.mypage.notConnected}
            </span>
          )
        })}
      </div>
    </section>
  )
}
