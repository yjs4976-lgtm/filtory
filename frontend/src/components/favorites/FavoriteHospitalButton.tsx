"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/useToast"
import { ROUTES } from "@/lib/routes"
import type { HospitalItem } from "@/lib/types"
import { canSaveFavoriteHospital, emitFavoriteHospitalChange, favoriteHospitalIdentity, getInternalFavoriteHospitalId, isInternalFavoriteHospital, savedHospitalService } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

type Props = { hospital: HospitalItem; initialFavorite?: boolean; favoriteHospitalId?: number; iconOnly?: boolean; onChange?: (favorite: boolean, context: { savedHospitalId?: number; previousFavorite: boolean }) => void; className?: string; showSuccessToast?: boolean }

export function FavoriteHospitalButton({ hospital, initialFavorite = false, favoriteHospitalId, iconOnly = false, onChange, className = "", showSuccessToast = true }: Props) {
  const { language } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [favorite, setFavorite] = useState(initialFavorite)
  const [savedId, setSavedId] = useState<number | undefined>(favoriteHospitalId)
  const [pending, setPending] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState(false)
  const mountedRef = useRef(true)
  const pendingRef = useRef(false)
  const actionVersionRef = useRef(0)
  const labels = language === "ko" ? { add: "관심 병원에 추가", button: "관심 병원", remove: "관심 병원에서 삭제", added: "관심 병원에 추가했어요.", removed: "관심 병원에서 삭제했어요.", fail: "관심 병원 저장 중 문제가 발생했어요. 다시 시도해주세요.", undo: "되돌리기", undoFailed: "변경 사항을 되돌리지 못했어요. 다시 시도해주세요.", title: "관심 병원을 저장하려면 로그인이 필요해요.", desc: "로그인하면 관심 있는 병원을 나중에 다시 확인할 수 있어요.", later: "나중에", login: "로그인하고 저장" } : { add: "Save to Favorites", button: "Save to Favorites", remove: "Remove from Favorites", added: "Added to your favorite hospitals.", removed: "Removed from your favorite hospitals.", fail: "Something went wrong while updating your favorite hospital. Please try again.", undo: "Undo", undoFailed: "We couldn't undo the change. Please try again.", title: "Sign in to save favorite hospitals.", desc: "After signing in, you can easily return to hospitals you are interested in.", later: "Not Now", login: "Sign In and Save" }
  const identity = favoriteHospitalIdentity(hospital)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => {
    const timeoutId = window.setTimeout(() => { setFavorite(initialFavorite); setSavedId(favoriteHospitalId) }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [favoriteHospitalId, initialFavorite])
  useEffect(() => {
    if (!isAuthenticated || !identity) return
    let alive = true
    const resolveVersion = actionVersionRef.current
    savedHospitalService.resolveFavorite(hospital).then((match) => { if (!alive || actionVersionRef.current !== resolveVersion) return; setFavorite(Boolean(match)); setSavedId(match?.id) }).catch(() => undefined)
    const sync = (event: Event) => { const detail = (event as CustomEvent<{ identity: string; favorite: boolean; savedId?: number }>).detail; if (detail?.identity !== identity) return; actionVersionRef.current += 1; setFavorite(detail.favorite); setSavedId(detail.savedId) }
    window.addEventListener("filtory:favorite-changed", sync)
    return () => { alive = false; window.removeEventListener("filtory:favorite-changed", sync) }
  }, [hospital, identity, isAuthenticated])
  const toggle = async () => {
    if (!isAuthenticated) { setLoginPrompt(true); return }
    if (pendingRef.current) return
    pendingRef.current = true
    actionVersionRef.current += 1
    const previous = favorite; setFavorite(!previous); setPending(true)
    try {
      let nextSavedId = savedId
      if (previous) {
        const deleteId = savedId ?? getInternalFavoriteHospitalId(hospital)
        if (!deleteId) throw new Error("FAVORITE_ID_REQUIRED")
        await savedHospitalService.unsaveHospital(undefined, deleteId); nextSavedId = undefined
      } else {
        const saved = isInternalFavoriteHospital(hospital)
          ? await savedHospitalService.saveHospital(undefined, getInternalFavoriteHospitalId(hospital)!)
          : await savedHospitalService.saveExternalHospital(hospital)
        nextSavedId = saved.id; if (mountedRef.current) setSavedId(saved.id)
      }
      emitFavoriteHospitalChange(hospital, !previous, nextSavedId)
      if (mountedRef.current) onChange?.(!previous, { savedHospitalId: nextSavedId, previousFavorite: previous })
      if (showSuccessToast) showToast({
        title: previous ? labels.removed : labels.added,
        tone: "success",
        actionLabel: labels.undo,
        onAction: async () => {
          try {
            if (previous) {
              const restored = isInternalFavoriteHospital(hospital)
                ? await savedHospitalService.saveHospital(undefined, getInternalFavoriteHospitalId(hospital)!)
                : await savedHospitalService.saveExternalHospital(hospital)
              emitFavoriteHospitalChange(hospital, true, restored.id)
              if (mountedRef.current) { setFavorite(true); setSavedId(restored.id) }
              onChange?.(true, { savedHospitalId: restored.id, previousFavorite: false })
            } else {
              if (!nextSavedId) throw new Error("FAVORITE_ID_REQUIRED")
              await savedHospitalService.unsaveHospital(undefined, nextSavedId)
              emitFavoriteHospitalChange(hospital, false)
              if (mountedRef.current) { setFavorite(false); setSavedId(undefined) }
              onChange?.(false, { previousFavorite: true })
            }
          } catch {
            showToast({ title: labels.undoFailed, tone: "info" })
            throw new Error("UNDO_FAILED")
          }
        },
      })
    } catch { if (mountedRef.current) setFavorite(previous); showToast({ title: labels.fail, tone: "info" }) } finally { pendingRef.current = false; if (mountedRef.current) setPending(false) }
  }
  const signIn = () => { sessionStorage.setItem("pendingFavoriteHospital", JSON.stringify(hospital)); setLoginPrompt(false); router.push(ROUTES.LOGIN) }
  if (!canSaveFavoriteHospital(hospital)) return null
  return <>
    <button type="button" className={`${styles.favoriteToggleButton} ${className}`} data-favorite={favorite} disabled={pending} aria-busy={pending} aria-pressed={favorite} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void toggle() }} aria-label={favorite ? labels.remove : labels.add} title={favorite ? labels.remove : labels.add}><Bookmark fill={favorite ? "currentColor" : "none"}/>{!iconOnly && <span>{language === "ko" ? "관심 병원" : favorite ? "Favorite" : labels.button}</span>}</button>
    {loginPrompt && <div className={styles.favoriteModalBackdrop} role="presentation" onClick={() => setLoginPrompt(false)}><section className={styles.favoriteModal} role="dialog" aria-modal="true" aria-labelledby="favorite-login-title" onClick={(event) => event.stopPropagation()}><h2 id="favorite-login-title">{labels.title}</h2><p>{labels.desc}</p><div><button onClick={() => setLoginPrompt(false)}>{labels.later}</button><button onClick={signIn}>{labels.login}</button></div></section></div>}
  </>
}
