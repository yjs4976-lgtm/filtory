import type { NextConfig } from "next"

const BACKEND_MAIN_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_MAIN_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
