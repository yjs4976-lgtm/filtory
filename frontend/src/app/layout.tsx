import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { MembershipProvider } from "@/context/MembershipContext";

export const metadata: Metadata = {
  title: "Filtory",
  description: "AI-powered hospital review trust analysis service",
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
