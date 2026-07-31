import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { MembershipProvider } from "@/context/MembershipContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://filtory.app"),
  title: {
    default: "Filtory | 병원 리뷰 신뢰도 분석",
    template: "%s | Filtory",
  },
  description: "피부과, 치과, 안과, 정형외과 리뷰의 구체성, 광고성 의심, 반복 표현을 AI로 점검해 병원 선택 전 확인을 돕는 리뷰 신뢰도 분석 서비스입니다.",
  keywords: ["병원 리뷰", "리뷰 신뢰도 분석", "광고성 의심 표현", "병원 선택 참고"],
  applicationName: "Filtory",
  creator: "Filtory",
  publisher: "Filtory",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "Filtory | 병원 리뷰 신뢰도 분석",
    description: "공개된 병원 리뷰의 구체성, 광고성 의심, 반복 표현을 AI로 점검해 병원 선택 전 참고할 수 있도록 도와드립니다.",
    url: "./",
    siteName: "Filtory",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Filtory 병원 리뷰 신뢰도 분석",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Filtory | 병원 리뷰 신뢰도 분석",
    description: "병원 선택 전, 공개 리뷰의 구체성과 광고성 의심 표현을 AI로 점검하는 참고 분석 서비스입니다.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <MembershipProvider>
                {children}
              </MembershipProvider>
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
