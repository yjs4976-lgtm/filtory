"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { SocialProvider } from "@/lib/types";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";

export function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveLogin } = useAuth();

  const [message, setMessage] = useState("소셜 로그인 처리 중입니다...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const provider = searchParams.get("provider") as SocialProvider | null;
        const accessToken =
          searchParams.get("accessToken") || searchParams.get("access_token");

        if (!provider || !accessToken) {
          setMessage("소셜 로그인 정보가 올바르지 않습니다.");
          return;
        }

        const result = await authService.socialCallback(provider, accessToken);

        saveLogin(result.data);
        router.replace(ROUTES.HOME);
      } catch {
        setMessage("소셜 로그인 처리 중 오류가 발생했습니다.");
      }
    };

    handleCallback();
  }, [router, searchParams, saveLogin]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Filtory</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
