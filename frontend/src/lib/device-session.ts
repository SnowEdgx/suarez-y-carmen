export const DEVICE_ID_COOKIE = 'syc_device_id'
export const DEVICE_ID_HEADER = 'x-syc-device-id'

const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CookieOptions = {
  maxAge?: number
  path?: string
  sameSite?: boolean | 'lax' | 'strict' | 'none'
  secure?: boolean
  httpOnly?: boolean
}

export function isValidDeviceId(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export function getDeviceCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}
