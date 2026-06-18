"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AnalyzeProgress } from "@/components/analyze/AnalyzeProgress"
import { AnalyzeStepper } from "@/components/analyze/AnalyzeStepper"
import { AnalyzeSubmitBar } from "@/components/analyze/AnalyzeSubmitBar"
import { CategoryStep } from "@/components/analyze/CategoryStep"
import { HospitalInfoStep } from "@/components/analyze/HospitalInfoStep"
import { ReviewInputStep } from "@/components/analyze/ReviewInputStep"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { HospitalCategory } from "@/lib/types"
import styles from "@/styles/App.module.css"

export default function AnalyzePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const stepTitles = t.analyze.steps
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [hospital, setHospital] = useState("")
  const [region, setRegion] = useState("")
  const [naver, setNaver] = useState("")
  const [google, setGoogle] = useState("")
  const [review, setReview] = useState("")
  const [loading, setLoading] = useState(false)

  function handleAnalyze() {
    setLoading(true)
    window.setTimeout(() => {
      router.push(ROUTES.RESULT)
    }, 1800)
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingIcon}>
          <Loader2 className={`${styles.iconLg} ${styles.spin}`} />
        </span>
        <p className={styles.loadingTitle}>{t.analyze.loading}</p>
        <p className={styles.loadingSub}>{t.analyze.loadingSub}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header title={t.analyze.title} showBack />

      <main className={`${styles.main} ${styles.stackMd}`}>
        <AnalyzeProgress currentStep={step} steps={stepTitles} />

        <AnalyzeStepper title={stepTitles[step]} step={step + 1} total={stepTitles.length}>
          {step === 0 && <CategoryStep category={category} onChange={setCategory} />}
          {step === 1 && (
            <HospitalInfoStep
              hospital={hospital}
              region={region}
              naver={naver}
              google={google}
              onHospitalChange={setHospital}
              onRegionChange={setRegion}
              onNaverChange={setNaver}
              onGoogleChange={setGoogle}
            />
          )}
          {step === 2 && <ReviewInputStep review={review} onReviewChange={setReview} />}
        </AnalyzeStepper>

        <AnalyzeSubmitBar
          canPrev={step > 0}
          canNext={step < stepTitles.length - 1}
          canSubmit={review.trim().length > 0}
          onPrev={() => setStep((prev) => Math.max(0, prev - 1))}
          onNext={() => setStep((prev) => Math.min(stepTitles.length - 1, prev + 1))}
          onSubmit={handleAnalyze}
        />
      </main>

      <BottomNav />
    </div>
  )
}
