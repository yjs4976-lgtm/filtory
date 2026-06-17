import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/context/LanguageContext"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "Filtory - AI 병원 리뷰 신뢰도 분석",
  description:
    "피부과, 안과, 치과 리뷰 신뢰도와 병원 정보 완성도를 분석해 더 믿을 수 있는 병원 선택을 돕는 AI 분석 서비스.",
}

export const viewport = {
  colorScheme: "light",
  themeColor: "#FFFCF8",
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
