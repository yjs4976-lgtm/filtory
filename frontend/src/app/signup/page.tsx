"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/App.module.css";

export default function SignupPage() {
  const { t } = useLanguage();

  return (
    <AuthCard
      title={t.auth.signupTitle}
      description={t.auth.signupDescription}
    >
      <SignupForm />

      <div className={styles.authDivider}>
        <span>{t.auth.divider}</span>
      </div>

      <SocialLoginButtons />
    </AuthCard>
  );
}
