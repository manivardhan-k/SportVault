import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { AUTH_UI_ENABLED } from '@/lib/auth-config'

export async function POST(request: Request) {
  if (!AUTH_UI_ENABLED) {
    return NextResponse.redirect(new URL('/', request.url), { status: 303 })
  }

  const supabase = createClient(await cookies())
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
