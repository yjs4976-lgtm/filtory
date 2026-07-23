"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { subscriptionPlans } from "@/data/subscriptionPlans"
import { useAuth } from "@/hooks/useAuth"
import { analysisUsageService, serverUsageToAllowance } from "@/services/analysisUsageService"
import { subscriptionService } from "@/services/subscriptionService"
import type { AnalysisAllowance, AnalysisUsageEvent, AnalysisUsageType } from "@/types/analysisAllowance"
import type { MonthlyFreeUsage } from "@/types/analysisAllowance"
import type { CancellationFeedback, MembershipEntitlement, SubscriptionPlan } from "@/types/subscription"
import { formatKoreanResetDate, getMonthlyUsagePeriod, getSeoulCalendarDateKey, hasMonthlyUsageReset } from "@/lib/monthlyUsage"

export type MembershipType = SubscriptionPlan
export type MembershipState = "FREE_NORMAL" | "FREE_EXHAUSTED" | "PLUS"
export const MOCK_MEMBERSHIP_STATE: MembershipState = "FREE_NORMAL"

type StoredAllowance = { allowance: AnalysisAllowance; usageEvents: AnalysisUsageEvent[] }
const storageKey = (userId: string) => `filtory:analysis-allowance:${userId}`
const defaultAllowance = (plan: SubscriptionPlan): AnalysisAllowance => ({ periodKey: getMonthlyUsagePeriod().periodKey, baseLimit: subscriptionPlans[plan].monthlyDetailedAnalysisLimit, rewardCount: 0, adminGrantedCount: 0, usedCount: plan === "FREE" ? 0 : 8, rewardedToday: false })

function readStoredAllowance(userId: string, plan: SubscriptionPlan): StoredAllowance {
  const fallback = { allowance: defaultAllowance(plan), usageEvents: [] }
  if (typeof window === "undefined") return fallback
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "null") as StoredAllowance | null
    if (!parsed?.allowance || !Array.isArray(parsed.usageEvents) || hasMonthlyUsageReset(parsed.allowance.periodKey)) return fallback
    const allowance = parsed.allowance
    const expectedLimit = subscriptionPlans[plan].monthlyDetailedAnalysisLimit
    return { allowance: { ...allowance, baseLimit: expectedLimit, rewardCount: plan === "PLUS" ? 0 : Math.max(0, allowance.rewardCount), adminGrantedCount: Math.max(0, allowance.adminGrantedCount), usedCount: Math.max(0, allowance.usedCount), rewardedToday: allowance.lastRewardedAt ? getSeoulCalendarDateKey(new Date(allowance.lastRewardedAt)) === getSeoulCalendarDateKey() : false }, usageEvents: parsed.usageEvents }
  } catch { return fallback }
}

type MembershipContextValue = {
  membershipType: SubscriptionPlan; entitlement: MembershipEntitlement; entitlementLoading: boolean
  totalCount: number; baseLimit: number; usedCount: number; rewardCount: number; adminGrantedCount: number; availableCount: number; remainingAnalyses: number; progress: number
  nextBillingDate?: string; hasPaymentHistory: boolean; canUseDetailedAnalysis: boolean; canWatchRewardAd: boolean
  monthlyFreeUsage: MonthlyFreeUsage; nextResetAt: string; formattedResetDate: string
  addRewardAnalysis: () => boolean; chargeCompletedAnalysis: (analysisId: string | number) => Promise<boolean>
  hasDetailedAccessForAnalysis: (analysisId: string | number | undefined) => boolean
  checkDetailedAccessForAnalysis: (analysisId: string | number | undefined) => Promise<boolean>
  startPlusPurchase: () => Promise<MembershipEntitlement>; restorePurchases: () => Promise<MembershipEntitlement | null>; scheduleCancellation: (feedback: CancellationFeedback) => Promise<MembershipEntitlement>; refreshEntitlement: () => Promise<void>
}

const MembershipContext = createContext<MembershipContextValue | null>(null)

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const userId = String(user?.id ?? "guest")
  const [entitlement, setEntitlement] = useState<MembershipEntitlement>({ userId, plan: "FREE", provider: null, status: "FREE", productId: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, lastVerifiedAt: null })
  const [entitlementLoading, setEntitlementLoading] = useState(true)
  const [initialStored] = useState(() => readStoredAllowance(userId, "FREE"))
  const [allowance, setAllowance] = useState(initialStored.allowance)
  const eventsRef = useRef(initialStored.usageEvents)
  const allowanceRef = useRef(initialStored.allowance)
  const serverReadyRef = useRef(false)

  const persist = useCallback((next: AnalysisAllowance) => {
    allowanceRef.current = next; setAllowance(next)
    if (typeof window !== "undefined" && user) localStorage.setItem(storageKey(userId), JSON.stringify({ allowance: next, usageEvents: eventsRef.current }))
  }, [user, userId])

  const refreshEntitlement = useCallback(async () => {
    if (!user) { setEntitlementLoading(false); return }
    setEntitlementLoading(true)
    try {
      const [membership, usage] = await Promise.all([
        analysisUsageService.getMembership(),
        analysisUsageService.getUsage(),
      ])
      const next: MembershipEntitlement = {
        userId,
        plan: membership.plan,
        provider: membership.provider,
        status: membership.status,
        productId: null,
        currentPeriodStart: membership.currentPeriodStart,
        currentPeriodEnd: membership.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        lastVerifiedAt: new Date().toISOString(),
        baseLimit: membership.baseLimit,
      }
      setEntitlement(next)
      serverReadyRef.current = true
      persist(serverUsageToAllowance(usage))
    } catch {
      // 로그인 사용자는 서버 확인 실패 시 fail-closed로 상세 분석을 열지 않는다.
      serverReadyRef.current = false
      const stored = readStoredAllowance(userId, "FREE")
      eventsRef.current = stored.usageEvents
      persist({ ...stored.allowance, baseLimit: 0, rewardCount: 0, adminGrantedCount: 0, usedCount: 0 })
    } finally { setEntitlementLoading(false) }
  }, [persist, user, userId])

  useEffect(() => {
    if (authLoading) return
    const timer = window.setTimeout(() => void refreshEntitlement(), 0)
    const visibility = () => { if (document.visibilityState === "visible") void refreshEntitlement() }
    document.addEventListener("visibilitychange", visibility)
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", visibility) }
  }, [authLoading, refreshEntitlement])

  const plan = entitlement.plan
  const availableCount = allowance.baseLimit + allowance.rewardCount + allowance.adminGrantedCount
  const remainingAnalyses = Math.max(availableCount - allowance.usedCount, 0)

  const addRewardAnalysis = useCallback(() => {
    // 로그인 사용자의 광고 보상은 서버 지급 API가 생기기 전까지 로컬에서 임의 승인하지 않는다.
    if (user) return false
    const current = allowanceRef.current
    if (entitlement.plan !== "FREE" || current.usedCount < current.baseLimit + current.rewardCount + current.adminGrantedCount || (current.lastRewardedAt && getSeoulCalendarDateKey(new Date(current.lastRewardedAt)) === getSeoulCalendarDateKey())) return false
    persist({ ...current, rewardCount: current.rewardCount + 1, rewardedToday: true, lastRewardedAt: new Date().toISOString() })
    return true
  }, [entitlement.plan, persist, user])

  const chargeCompletedAnalysis = useCallback(async (analysisId: string | number) => {
    const id = String(analysisId)
    if (!id) return false
    if (user) {
      if (!serverReadyRef.current) return false
      try {
        const usage = await analysisUsageService.charge(id)
        persist(serverUsageToAllowance(usage))
        return Boolean(usage.charged || usage.alreadyCharged)
      } catch {
        return false
      }
    }
    if (eventsRef.current.some((event) => event.analysisId === id)) return true
    const current = allowanceRef.current
    const available = current.baseLimit + current.rewardCount + current.adminGrantedCount
    if (current.usedCount >= available) return false
    let usageType: AnalysisUsageType = entitlement.plan === "PLUS" ? "PLUS" : "FREE_BASE"
    if (entitlement.plan === "FREE" && current.usedCount >= current.baseLimit + current.adminGrantedCount) usageType = "REWARDED"
    else if (current.usedCount >= current.baseLimit) usageType = "ADMIN_GRANTED"
    eventsRef.current = [...eventsRef.current, { id: crypto.randomUUID(), userId, analysisId: id, usageType, chargedAt: new Date().toISOString() }]
    persist({ ...current, usedCount: current.usedCount + 1 })
    return true
  }, [entitlement.plan, persist, user, userId])

  const hasDetailedAccessForAnalysis = useCallback((analysisId: string | number | undefined) => {
    if (user && !serverReadyRef.current) return false
    if (analysisId !== undefined && eventsRef.current.some((event) => event.analysisId === String(analysisId))) return true
    return allowanceRef.current.usedCount < allowanceRef.current.baseLimit + allowanceRef.current.rewardCount + allowanceRef.current.adminGrantedCount
  }, [user])

  const checkDetailedAccessForAnalysis = useCallback(async (analysisId: string | number | undefined) => {
    if (analysisId === undefined) return false
    if (!user) return hasDetailedAccessForAnalysis(analysisId)
    try {
      const access = await analysisUsageService.getAccess(analysisId)
      persist(serverUsageToAllowance(access))
      serverReadyRef.current = true
      return access.canAccess
    } catch {
      return false
    }
  }, [hasDetailedAccessForAnalysis, persist, user])

  const startPlusPurchase = useCallback(async () => {
    if (!user) throw new Error("로그인이 필요합니다.")
    if (entitlement.plan === "PLUS" && ["ACTIVE", "CANCEL_SCHEDULED", "GRACE_PERIOD"].includes(entitlement.status)) throw new Error("이미 Filtory Plus를 이용하고 있어요.")
    await refreshEntitlement()
    throw new Error("Plus는 현재 서버 mock entitlement 테스트 전용입니다.")
  }, [entitlement.plan, entitlement.status, refreshEntitlement, user])

  const restorePurchases = useCallback(async () => {
    if (!user) throw new Error("로그인이 필요합니다.")
    await refreshEntitlement()
    return null
  }, [refreshEntitlement, user])

  const scheduleCancellation = useCallback(async (feedback: CancellationFeedback) => {
    await subscriptionService.submitCancellationFeedback(feedback)
    await refreshEntitlement()
    return entitlement
  }, [entitlement, refreshEntitlement])

  const value = useMemo<MembershipContextValue>(() => ({
    membershipType: plan, entitlement, entitlementLoading, totalCount: allowance.baseLimit, baseLimit: allowance.baseLimit, usedCount: allowance.usedCount, rewardCount: allowance.rewardCount, adminGrantedCount: allowance.adminGrantedCount,
    availableCount, remainingAnalyses, progress: availableCount ? Math.min(allowance.usedCount / availableCount * 100, 100) : 0,
    nextBillingDate: entitlement.currentPeriodEnd?.slice(0, 10), hasPaymentHistory: entitlement.provider !== null, canUseDetailedAnalysis: remainingAnalyses > 0,
    canWatchRewardAd: plan === "FREE" && remainingAnalyses === 0 && !allowance.rewardedToday,
    monthlyFreeUsage: { detailedAnalysisLimit: allowance.baseLimit, detailedAnalysisUsed: allowance.usedCount, usagePeriodStart: getMonthlyUsagePeriod().usagePeriodStart, usagePeriodEnd: getMonthlyUsagePeriod().usagePeriodEnd, nextResetAt: getMonthlyUsagePeriod().nextResetAt },
    nextResetAt: getMonthlyUsagePeriod().nextResetAt, formattedResetDate: formatKoreanResetDate(getMonthlyUsagePeriod().nextResetAt),
    addRewardAnalysis, chargeCompletedAnalysis, hasDetailedAccessForAnalysis, checkDetailedAccessForAnalysis, startPlusPurchase, restorePurchases, scheduleCancellation, refreshEntitlement,
  }), [addRewardAnalysis, allowance, availableCount, chargeCompletedAnalysis, checkDetailedAccessForAnalysis, entitlement, entitlementLoading, hasDetailedAccessForAnalysis, plan, refreshEntitlement, remainingAnalyses, restorePurchases, scheduleCancellation, startPlusPurchase])

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

export function useMembership() { const context = useContext(MembershipContext); if (!context) throw new Error("useMembership must be used within MembershipProvider"); return context }
