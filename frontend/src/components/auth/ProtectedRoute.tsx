"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import styles from "@/styles/App.module.css";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLogin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLogin) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isLoading, isLogin, router]);

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <LoadingSpinner label="로그인 상태를 확인하고 있어요." />
      </div>
    );
  }

  if (!isLogin) {
    return null;
  }

  return <>{children}</>;
}
