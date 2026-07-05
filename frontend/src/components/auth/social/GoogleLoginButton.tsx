"use client";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";

export function GoogleLoginButton({ nextPath }: { nextPath?: string | null }) {
  return (
    <SocialLoginButton
      provider="google"
      onClick={() => authService.socialLogin("google", nextPath)}
    />
  );
}
