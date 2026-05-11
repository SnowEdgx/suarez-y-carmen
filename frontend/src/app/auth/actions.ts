'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  AUTH_SESSION_PREFERENCE_COOKIE,
  getExpiredSessionPreferenceCookieOptions,
} from '@/lib/auth-session'
import { createClient } from '@/lib/supabase/server'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.set(
    AUTH_SESSION_PREFERENCE_COOKIE,
    '',
    getExpiredSessionPreferenceCookieOptions()
  )

  revalidatePath('/', 'layout')
  redirect('/login')
}
