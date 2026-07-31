"use client"

import { MonitorCog } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import type { WorkspacePreference } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function WorkspacePreferenceSettings() {
  const { isAdmin, workspaceSettings, setPreferredWorkspace } = useAuth()
  const { language } = useLanguage()
  const { showToast } = useToast()
  if (!isAdmin) return null
  const ko = language === "ko"
  const save = (value: WorkspacePreference) => {
    setPreferredWorkspace(value)
    showToast({ title: ko ? "로그인 후 시작 화면이 저장되었습니다." : "Your login start screen has been saved.", tone: "success" })
  }
  return <section className={styles.workspacePreferenceCard}>
    <div><span><MonitorCog /></span><div><h2>{ko ? "관리자 화면 설정" : "Administrator workspace"}</h2><p>{ko ? "로그인 후 시작 화면" : "Start screen after login"}</p></div></div>
    <div className={styles.workspacePreferenceOptions} role="radiogroup">
      {([
        ["USER", ko ? "사용자 화면" : "User app"],
        ["ADMIN", ko ? "관리자 센터" : "Admin Center"],
        ["LAST_USED", ko ? "마지막으로 이용한 화면" : "Last used workspace"],
      ] as const).map(([value, label]) => <label key={value}><input type="radio" name="workspace-preference" value={value} checked={workspaceSettings.preferredWorkspace === value} onChange={() => save(value)} /><span>{label}</span></label>)}
    </div>
    <small>{ko ? "이 설정은 화면 이동 기본값이며 관리자 권한을 변경하지 않습니다." : "This changes navigation only, not administrator access."}</small>
  </section>
}
