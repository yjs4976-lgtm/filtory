"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import styles from "@/styles/App.module.css";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLogin, isLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && !isLogin) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isLoading, isLogin, router]);

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <LoadingSpinner label={t.auth.checkingLogin} />
      </div>
    );
  }

  if (!isLogin) {
    return null;
  }

  return <>{children}</>;
}
