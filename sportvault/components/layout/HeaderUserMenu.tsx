import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { AUTH_UI_ENABLED } from '@/lib/auth-config'

export async function HeaderUserMenu() {
  if (!AUTH_UI_ENABLED) return null

  const supabase = createClient(await cookies())
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email as string | undefined

  if (!email) {
    return (
      <div className="px-6">
        <Link
          href="/login"
          className="text-[12px] font-medium px-3 py-1.5 rounded-md"
          style={{
            color: '#111110',
            background: '#faf9f7',
            border: '1px solid #e4e3df',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <span
        className="text-[11px]"
        style={{ color: '#5a5955', fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        {email}
      </span>
      <form action="/logout" method="post">
        <button
          type="submit"
          className="text-[11px] underline"
          style={{ color: '#9a9894' }}
        >
          sign out
        </button>
      </form>
    </div>
  )
}
