"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/App.module.css";

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthCard
      title={t.auth.loginTitle}
      description={t.auth.loginDescription}
    >
      <LoginForm />

      <div className={styles.authDivider}>
        <span>{t.auth.divider}</span>
      </div>

      <SocialLoginButtons />
    </AuthCard>
  );
}
