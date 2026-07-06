import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filtory",
    short_name: "Filtory",
    description: "병원 리뷰를 한 번 더 살펴보고 선택을 도와주는 리뷰 검토 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#DCCFFF",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
