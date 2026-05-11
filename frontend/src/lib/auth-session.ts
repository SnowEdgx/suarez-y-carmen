export const AUTH_SESSION_PREFERENCE_COOKIE = 'syc_session_preference'

const SHORT_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60
const REMEMBER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

type CookieOptions = {
  maxAge?: number
  path?: string
  sameSite?: boolean | 'lax' | 'strict' | 'none'
  secure?: boolean
  httpOnly?: boolean
}

export function isRememberSessionPreference(value: unknown) {
  return value === 'remember'
}

export function resolveRememberSession(options: {
  rememberSession?: boolean | null
  preferenceCookie?: string | null
}) {
  if (typeof options.rememberSession === 'boolean') {
    return options.rememberSession
  }

  return isRememberSessionPreference(options.preferenceCookie)
}

export function getAuthSessionMaxAgeSeconds(rememberSession: boolean) {
  return rememberSession ? REMEMBER_SESSION_MAX_AGE_SECONDS : SHORT_SESSION_MAX_AGE_SECONDS
}

export function applyAuthSessionMaxAge<T extends CookieOptions>(
  options: T,
  rememberSession: boolean
): T {
  if (options.maxAge === 0) return options

  return {
    ...options,
    maxAge: getAuthSessionMaxAgeSeconds(rememberSession),
  }
}

export function getSessionPreferenceCookieValue(rememberSession: boolean) {
  return rememberSession ? 'remember' : 'short'
}

export function getSessionPreferenceCookieOptions(rememberSession: boolean): CookieOptions {
  return {
    httpOnly: true,
    maxAge: getAuthSessionMaxAgeSeconds(rememberSession),
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}

export function getExpiredSessionPreferenceCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}
