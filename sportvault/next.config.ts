import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production'

function optionalOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function contentSecurityPolicy(): string {
  const connectSources = [
    "'self'",
    optionalOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL),
    optionalOrigin(process.env.UPSTASH_REDIS_REST_URL),
  ].filter(Boolean)

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]

  if (!isDev) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
    ]
  },
};

export default nextConfig;
