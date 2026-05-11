import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  applyAuthSessionMaxAge,
  AUTH_SESSION_PREFERENCE_COOKIE,
  resolveRememberSession,
} from '@/lib/auth-session'

type CreateClientOptions = {
  rememberSession?: boolean | null
}

export async function createClient(options: CreateClientOptions = {}) {
  const cookieStore = await cookies()
  const rememberSession = resolveRememberSession({
    rememberSession: options.rememberSession,
    preferenceCookie: cookieStore.get(AUTH_SESSION_PREFERENCE_COOKIE)?.value,
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applyAuthSessionMaxAge(options, rememberSession))
            )
          } catch {
            // setAll can be called from places where cookies are read-only.
            // Middleware handles session refresh in those cases.
          }
        },
      },
    }
  )
}
