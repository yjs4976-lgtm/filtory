import type { MetadataRoute } from "next"

const SITE_URL = "https://filtory.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/admin/*",
        "/mypage",
        "/mypage/",
        "/mypage/*",
        "/history",
        "/history/",
        "/history/*",
        "/result",
        "/auth/",
        "/api/",
        "/verify-email",
        "/reset-password",
        "/forgot-password",
        "/find-id",
        "/login",
        "/signup",
        "/unauthorized",
        "/help/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
