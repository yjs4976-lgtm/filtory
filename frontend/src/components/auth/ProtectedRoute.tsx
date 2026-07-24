"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import styles from "@/styles/App.module.css";
import { sanitizeAuthRedirectPath } from "@/lib/navigation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLogin, isLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isLoading && !isLogin) {
      const query = searchParams.toString();
      const currentPath = sanitizeAuthRedirectPath(`${pathname}${query ? `?${query}` : ""}`);
      router.replace(currentPath
        ? `${ROUTES.LOGIN}?next=${encodeURIComponent(currentPath)}`
        : ROUTES.LOGIN
      );
    }
  }, [isLoading, isLogin, pathname, router, searchParams]);

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
