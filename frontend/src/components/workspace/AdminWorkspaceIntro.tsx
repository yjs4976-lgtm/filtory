"use client"

import { useState } from "react"
import { ShieldCheck, X } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { Workspace } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function AdminWorkspaceIntro({ onSelect }: { onSelect: (workspace: Workspace, remember: boolean) => void }) {
  const { language } = useLanguage()
  const [remember, setRemember] = useState(false)
  const ko = language === "ko"
  return <div className={styles.workspaceModalBackdrop} role="presentation">
    <section className={styles.workspaceIntroModal} role="dialog" aria-modal="true" aria-labelledby="workspace-intro-title">
      <button className={styles.workspaceModalClose} type="button" aria-label={ko ? "닫기" : "Close"} onClick={() => onSelect("USER", remember)}><X /></button>
      <span className={styles.workspaceIntroIcon}><ShieldCheck /></span>
      <p className={styles.workspaceEyebrow}>FILTORY ADMIN</p>
      <h2 id="workspace-intro-title">{ko ? "관리자 권한이 활성화되었어요" : "Administrator access is now active"}</h2>
      <p>{ko ? <>Filtory 사용자 화면과 관리자 센터를<br />하나의 계정으로 이용할 수 있어요.</> : <>Use the Filtory app and Admin Center<br />with the same account.</>}</p>
      <label className={styles.workspaceRemember}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />{ko ? "다음부터 선택한 화면으로 바로 이동" : "Go straight to this workspace next time"}</label>
      <button type="button" className={styles.workspacePrimary} onClick={() => onSelect("ADMIN", remember)}>{ko ? "관리자 센터 둘러보기" : "Explore Admin Center"}</button>
      <button type="button" className={styles.workspaceSecondary} onClick={() => onSelect("USER", remember)}>{ko ? "사용자 화면 계속 이용" : "Continue to user app"}</button>
    </section>
  </div>
}
