import { isUuid } from '@/lib/uuid'

export const DEVICE_ID_COOKIE = 'syc_device_id'
export const DEVICE_ID_HEADER = 'x-syc-device-id'

const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

type CookieOptions = {
  maxAge?: number
  path?: string
  sameSite?: boolean | 'lax' | 'strict' | 'none'
  secure?: boolean
  httpOnly?: boolean
}

export function isValidDeviceId(value: unknown): value is string {
  return isUuid(value)
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
