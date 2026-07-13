# Deploy Notes

## 2026-07-12 Nginx 보안 헤더 추가

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `/api/` proxy timeout 120s 적용
