"use client";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";

export function KakaoLoginButton({ nextPath }: { nextPath?: string | null }) {
  return (
    <SocialLoginButton
      provider="kakao"
      onClick={() => authService.socialLogin("kakao", nextPath)}
    />
  );
}
