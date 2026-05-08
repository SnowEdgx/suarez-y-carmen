'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const EMAIL_VERIFICATION_ERROR =
  'Debes verificar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada.'

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

function getSafeRedirectPath(rawValue: FormDataEntryValue | null) {
  const fallback = '/courses'
  if (!rawValue || typeof rawValue !== 'string') return fallback
  if (!rawValue.startsWith('/')) return fallback
  if (rawValue.startsWith('//')) return fallback
  return rawValue
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

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = normalizeEmail(formData.get('email'))
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''

  if (!isValidEmail(email) || password.length < 1) {
    return { error: 'Introduce un correo valido y tu contrase\u00f1a.' }
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
    return { error: 'Credenciales invalidas. Verifica tu correo y contrase\u00f1a.' }
  }

  if (!isEmailVerified(authData.user)) {
    await supabase.auth.signOut()
    return { error: EMAIL_VERIFICATION_ERROR }
  }

  const redirectPath = getSafeRedirectPath(formData.get('next'))
  revalidatePath('/', 'layout')
  redirect(redirectPath)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''
  const email = normalizeEmail(formData.get('email'))
  const name = typeof formData.get('name') === 'string' ? (formData.get('name') as string).trim() : ''

  if (password.length < 6) {
    return { error: 'La contrase\u00f1a debe tener al menos 6 caracteres.' }
  }
  if (!isValidEmail(email)) {
    return { error: 'Introduce un correo valido.' }
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
    console.error('[Login Action] Signup error details:', error)
    return {
      error:
        'Ocurrio un error al procesar tu solicitud. Reintenta mas tarde o contactanos si persiste.',
    }
  }

  if (!isEmailVerified(authData.user)) {
    await supabase.auth.signOut()
    return {
      success:
        'Te enviamos un correo de verificacion. Confirma tu cuenta para iniciar sesion y acceder a tus cursos.',
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
    return { error: 'Indica tu correo para reenviar la verificacion.' }
  }
  if (!isValidEmail(email)) {
    return { error: 'El correo indicado no es valido.' }
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
    },
  })

  if (error) {
    console.error('[Login Action] Resend verification error:', error)
    return { error: 'No pudimos reenviar el correo en este momento. Intentalo de nuevo.' }
  }

  return { success: 'Correo de verificacion reenviado. Revisa tu bandeja de entrada.' }
}

export async function requestPasswordRecovery(formData: FormData) {
  const supabase = await createClient()
  const email = getSafeEmail(formData.get('email'))

  if (!email) {
    return { error: 'Introduce un correo valido para recuperar tu cuenta.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRecoveryRedirectUrl(),
  })

  if (error) {
    console.error('[Login Action] Password recovery request error:', error)
    return { error: 'No pudimos iniciar la recuperacion en este momento. Intentalo de nuevo.' }
  }

  return {
    success:
      'Si el correo existe en la plataforma, te hemos enviado un enlace para restablecer tu contrase\u00f1a.',
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''
  const confirmPassword =
    typeof formData.get('confirmPassword') === 'string' ? (formData.get('confirmPassword') as string) : ''

  if (password.length < 8) {
    return { error: 'La nueva contrase\u00f1a debe tener al menos 8 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contrase\u00f1as no coinciden.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'La sesion de recuperacion ha expirado. Solicita un nuevo enlace.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[Login Action] Password update error:', error)
    return { error: 'No pudimos actualizar la contrase\u00f1a. Intentalo de nuevo.' }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(getPasswordUpdatedRedirectUrl())
}
