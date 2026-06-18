"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
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
        const error = searchParams.get("error");

        if (error) {
          setMessage("소셜 로그인 처리 중 오류가 발생했습니다.");
          return;
        }

        const result = await authService.me();
        saveLogin({ user: result.data });
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
