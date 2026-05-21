import Link from 'next/link'
import { notFound } from 'next/navigation'
import { signIn, signUp } from './actions'
import { AUTH_UI_ENABLED } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  if (!AUTH_UI_ENABLED) notFound()

  const sp = await searchParams

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-16"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-lg"
        style={{ background: '#ffffff', border: '1px solid #e4e3df' }}
      >
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: '#111110' }}>
          Sign in
        </h1>
        <p className="text-[12px] mb-6" style={{ color: '#9a9894' }}>
          Use your email and password.
        </p>

        {sp.error && (
          <p
            className="mb-4 px-3 py-2 rounded text-[12px]"
            style={{ background: '#fff1f0', color: '#9b1c1c', border: '1px solid #fecaca' }}
          >
            {sp.error}
          </p>
        )}
        {sp.notice === 'check-email' && (
          <p
            className="mb-4 px-3 py-2 rounded text-[12px]"
            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
          >
            Check your email to confirm your account.
          </p>
        )}

        <form className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] mb-1" style={{ color: '#9a9894' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded border text-[14px]"
              style={{ borderColor: '#e4e3df', background: '#faf9f7' }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] mb-1" style={{ color: '#9a9894' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              minLength={6}
              className="w-full px-3 py-2 rounded border text-[14px]"
              style={{ borderColor: '#e4e3df', background: '#faf9f7' }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              formAction={signIn}
              className="flex-1 px-4 py-2 rounded text-[13px] font-medium"
              style={{ background: '#111110', color: '#faf9f7' }}
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="flex-1 px-4 py-2 rounded text-[13px] font-medium"
              style={{ background: '#faf9f7', color: '#111110', border: '1px solid #e4e3df' }}
            >
              Sign up
            </button>
          </div>
        </form>

        <Link
          href="/"
          className="block mt-6 text-center text-[12px] underline"
          style={{ color: '#5a5955' }}
        >
          ← Back home
        </Link>
      </div>
    </div>
  )
}
