import type { SocialProvider } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

export const AI_API_BASE_URL =
  process.env.NEXT_PUBLIC_AI_API_URL ||
  "http://127.0.0.1:8000";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const SOCIAL_PROVIDERS: Record<
  SocialProvider,
  {
    label: string;
    icon: string;
    color: string;
  }
> = {
  kakao: {
    label: "카카오",
    icon: "/icons/kakao-logo.svg",
    color: "#FEE500",
  },
  google: {
    label: "구글",
    icon: "/icons/google-logo.svg",
    color: "#FFFFFF",
  },
  naver: {
    label: "네이버",
    icon: "/icons/naver-logo.svg",
    color: "#03C75A",
  },
};
