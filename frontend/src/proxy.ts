import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  applyAuthSessionMaxAge,
  AUTH_SESSION_PREFERENCE_COOKIE,
  resolveRememberSession,
} from './lib/auth-session'
import {
  DEVICE_ID_COOKIE,
  DEVICE_ID_HEADER,
  getDeviceCookieOptions,
  isValidDeviceId,
} from './lib/device-session'

const PROTECTED_ROUTES = ['/profile', '/admin', '/dashboard', '/account']

function requiresAuth(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export async function proxy(request: NextRequest) {
  const existingDeviceId = request.cookies.get(DEVICE_ID_COOKIE)?.value
  const deviceId = isValidDeviceId(existingDeviceId) ? existingDeviceId : crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(DEVICE_ID_HEADER, deviceId)

  request.cookies.set(DEVICE_ID_COOKIE, deviceId)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  if (existingDeviceId !== deviceId) {
    response.cookies.set(DEVICE_ID_COOKIE, deviceId, getDeviceCookieOptions())
  }

  const rememberSession = resolveRememberSession({
    preferenceCookie: request.cookies.get(AUTH_SESSION_PREFERENCE_COOKIE)?.value,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, applyAuthSessionMaxAge(options, rememberSession))
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (requiresAuth(request.nextUrl.pathname) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
