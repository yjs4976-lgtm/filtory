"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { sanitizeInternalNextPath } from "@/lib/navigation";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { LogoMark } from "@/components/common/LogoMark";
import styles from "@/styles/App.module.css";

export function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveLogin } = useAuth();
  const { t } = useLanguage();

  const [message, setMessage] = useState(t.auth.socialProcessingDescription);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get("error");

        if (error) {
          setMessage(t.auth.socialProcessingError);
          return;
        }

        const result = await authService.me();
        saveLogin({ user: result.data });
        const nextPath = sanitizeInternalNextPath(searchParams.get("next"));
        router.replace(nextPath ?? ROUTES.HOME);
      } catch {
        setMessage(t.auth.socialProcessingError);
      }
    };

    handleCallback();
  }, [router, searchParams, saveLogin, t.auth.socialProcessingError]);

  return (
    <main className={styles.authPage}>
      <section className={styles.authCard}>
        <div className={styles.authLogo}>
          <LogoMark size={34} className={styles.authLogoMark} />
          <span>Filtory</span>
        </div>
        <p>{message}</p>
      </section>
    </main>
  );
}
