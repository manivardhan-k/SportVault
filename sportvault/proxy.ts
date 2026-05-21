import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_UI_ENABLED } from '@/lib/auth-config'

const RATE_LIMIT_WINDOW_MS = 60_000
const API_RATE_LIMIT = 180
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/api/') && pathname !== '/login') return false

  const now = Date.now()
  const key = `${clientIp(request)}:${pathname}`
  const bucket = rateLimitBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > API_RATE_LIMIT
}

export async function proxy(request: NextRequest) {
  if (isRateLimited(request)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!AUTH_UI_ENABLED || !supabaseUrl || !supabaseKey) return response

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getClaims()
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
