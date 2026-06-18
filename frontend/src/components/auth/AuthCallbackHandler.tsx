"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import type { SocialProvider, User } from "@/lib/types";
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
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        const accessToken =
          searchParams.get("accessToken") || searchParams.get("access_token");

        const userText = searchParams.get("user");

        if (accessToken && userText) {
          const user = JSON.parse(decodeURIComponent(userText)) as User;

          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

          saveLogin({
            accessToken,
            user,
          });

          router.replace(ROUTES.HOME);
          return;
        }

        if (!provider || !code) {
          setMessage("소셜 로그인 정보가 올바르지 않습니다.");
          return;
        }

        const result = await authService.socialCallback(provider, code, state || undefined);

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