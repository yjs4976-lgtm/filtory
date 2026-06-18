"use client"

import { useRef, useState } from "react"
import { Camera, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { memberService } from "@/services/memberService"
import styles from "@/styles/App.module.css"

interface ProfileImageUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function ProfileImageUploader({ value, onChange }: ProfileImageUploaderProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState("")

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError("")

    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t.mypage.photoInvalidType)
      event.target.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t.mypage.photoTooLarge)
      event.target.value = ""
      return
    }

    onChange(memberService.previewProfileImage(file))
  }

  const handleReset = () => {
    setError("")
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <p className={styles.titleSm}>{t.mypage.profilePhoto}</p>
      <div className={styles.profileUploaderRow}>
        <span className={styles.profilePreview}>
          {value ? (
            <span className={styles.avatarImage} style={{ backgroundImage: `url(${value})` }} aria-hidden="true" />
          ) : (
            <UserRound className={styles.iconLg} />
          )}
        </span>
        <div className={styles.profileUploadActions}>
          <input
            ref={inputRef}
            className={styles.visuallyHidden}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          <button type="button" className={styles.secondaryButton} onClick={() => inputRef.current?.click()}>
            <Camera className={styles.iconSm} />
            {t.mypage.changePhoto}
          </button>
          <button type="button" className={styles.textButton} onClick={handleReset}>
            {t.mypage.resetPhoto}
          </button>
        </div>
      </div>
      <p className={styles.mutedText}>{t.mypage.photoHelp}</p>
      {error && <p className={styles.formError}>{error}</p>}
    </section>
  )
}
