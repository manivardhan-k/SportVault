'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { AUTH_UI_ENABLED } from '@/lib/auth-config'

export async function signIn(formData: FormData) {
  if (!AUTH_UI_ENABLED) redirect('/')

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient(await cookies())
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData) {
  if (!AUTH_UI_ENABLED) redirect('/')

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = createClient(await cookies())
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect('/login?notice=check-email')
}
