'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  AUTH_SESSION_PREFERENCE_COOKIE,
  getSessionPreferenceCookieOptions,
  getSessionPreferenceCookieValue,
} from '@/lib/auth-session'
import { getSafeInternalPath } from '@/lib/safe-redirect'
import { createClient } from '@/lib/supabase/server'

const EMAIL_VERIFICATION_ERROR =
  'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'

type AuthUser = {
  email_confirmed_at?: string | null
  confirmed_at?: string | null
} | null

function isEmailVerified(user: AuthUser) {
  return Boolean(user?.email_confirmed_at ?? user?.confirmed_at)
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function getAuthCallbackUrl(nextPath: string) {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`
}

function getEmailRedirectUrl() {
  return getAuthCallbackUrl('/login?verified=1')
}

function getRecoveryRedirectUrl() {
  return getAuthCallbackUrl('/auth/update-password')
}

function getPasswordUpdatedRedirectUrl() {
  return `${getSiteUrl()}/login?password_updated=1`
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getSafeEmail(rawValue: FormDataEntryValue | null) {
  const email = normalizeEmail(rawValue)
  return isValidEmail(email) ? email : ''
}

function shouldRememberSession(value: FormDataEntryValue | null) {
  return value === 'true' || value === 'on'
}

async function persistSessionPreference(rememberSession: boolean) {
  const cookieStore = await cookies()
  cookieStore.set(
    AUTH_SESSION_PREFERENCE_COOKIE,
    getSessionPreferenceCookieValue(rememberSession),
    getSessionPreferenceCookieOptions(rememberSession)
  )
}

export async function login(formData: FormData) {
  const rememberSession = shouldRememberSession(formData.get('rememberSession'))
  const supabase = await createClient({ rememberSession })
  const email = normalizeEmail(formData.get('email'))
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''

  if (!isValidEmail(email) || password.length < 1) {
    return { error: 'Introduce un correo válido y tu contraseña.' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.warn('[Login Action] Login failed')
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: EMAIL_VERIFICATION_ERROR }
    }
    return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' }
  }

  if (!isEmailVerified(authData.user)) {
    await supabase.auth.signOut()
    return { error: EMAIL_VERIFICATION_ERROR }
  }

  const redirectPath = getSafeInternalPath(formData.get('next'), '/courses')
  await persistSessionPreference(rememberSession)
  revalidatePath('/', 'layout')
  redirect(redirectPath)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''
  const email = normalizeEmail(formData.get('email'))
  const name = typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : ''

  if (password.length < 8) {
    return { error: 'La contrase\u00f1a debe tener al menos 8 caracteres.' }
  }
  if (!isValidEmail(email)) {
    return { error: 'Introduce un correo válido.' }
  }
  if (name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.' }
  }

  const { error, data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      data: { name },
    },
  })

  if (error) {
    console.error('[Login Action] Signup failed:', error.message)
    return {
      error:
        'Ocurrió un error al procesar tu solicitud. Reintenta más tarde o contáctanos si persiste.',
    }
  }

  if (!isEmailVerified(authData.user)) {
    await supabase.auth.signOut()
    return {
      success:
        'Te enviamos un correo de verificación. Confirma tu cuenta para iniciar sesión y acceder a tus cursos.',
      requiresEmailVerification: true,
      email,
    }
  }

  revalidatePath('/', 'layout')
  redirect('/courses')
}

export async function resendSignupVerification(formData: FormData) {
  const supabase = await createClient()
  const email = normalizeEmail(formData.get('email'))

  if (!email) {
    return { error: 'Indica tu correo para reenviar la verificación.' }
  }
  if (!isValidEmail(email)) {
    return { error: 'El correo indicado no es válido.' }
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
    },
  })

  if (error) {
    console.error('[Login Action] Resend verification failed:', error.message)
    return { error: 'No pudimos reenviar el correo en este momento. Inténtalo de nuevo.' }
  }

  return { success: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.' }
}

export async function requestPasswordRecovery(formData: FormData) {
  const supabase = await createClient()
  const email = getSafeEmail(formData.get('email'))

  if (!email) {
    return { error: 'Introduce un correo válido para recuperar tu cuenta.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRecoveryRedirectUrl(),
  })

  if (error) {
    console.error('[Login Action] Password recovery request failed:', error.message)
    return { error: 'No pudimos iniciar la recuperación en este momento. Inténtalo de nuevo.' }
  }

  return {
    success:
      'Si el correo existe en la plataforma, te hemos enviado un enlace para restablecer tu contraseña.',
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''
  const confirmPassword =
    typeof formData.get('confirmPassword') === 'string' ? (formData.get('confirmPassword') as string) : ''

  if (password.length < 8) {
    return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'La sesión de recuperación ha expirado. Solicita un nuevo enlace.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[Login Action] Password update failed:', error.message)
    return { error: 'No pudimos actualizar la contraseña. Inténtalo de nuevo.' }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(getPasswordUpdatedRedirectUrl())
}
