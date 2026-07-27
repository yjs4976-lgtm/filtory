import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Filtory",
    short_name: "Filtory",
    description: "병원 선택 전 공개 리뷰의 신뢰도를 점검하는 참고 분석 서비스",
    start_url: "/",
    scope: "/",
    lang: "ko",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#DCCFFF",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
