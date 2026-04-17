'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

function getEmailRedirectUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${siteUrl.replace(/\/$/, '')}/login?verified=1`
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getSafeRedirectPath(rawValue: FormDataEntryValue | null) {
  const fallback = '/courses'
  if (!rawValue || typeof rawValue !== 'string') return fallback
  if (!rawValue.startsWith('/')) return fallback
  if (rawValue.startsWith('//')) return fallback
  return rawValue
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = normalizeEmail(formData.get('email'))
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : ''

  if (!isValidEmail(email) || password.length < 1) {
    return { error: 'Introduce un correo válido y tu contraseña.' }
  }

  const data = {
    email,
    password,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.warn('[Login Action] Login failed')
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: EMAIL_VERIFICATION_ERROR }
    }
    return { error: 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.' }
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
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (!isValidEmail(email)) {
    return { error: 'Introduce un correo válido.' }
  }
  if (name.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.' }
  }

  const data = {
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      data: {
        name,
      },
    },
  }

  const { error, data: authData } = await supabase.auth.signUp(data)

  if (error) {
    console.error('[Login Action] Signup error details:', error)
    return {
      error:
        'Ocurrió un error al procesar tu solicitud. Por favor, reintenta más tarde o contáctanos si el problema persiste.',
    }
  }

  if (!isEmailVerified(authData.user)) {
    await supabase.auth.signOut()
    return {
      success:
        'Te enviamos un correo de verificación. Confirma tu cuenta para poder iniciar sesión y acceder a tus cursos.',
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
    console.error('[Login Action] Resend verification error:', error)
    return { error: 'No pudimos reenviar el correo en este momento. Inténtalo de nuevo en unos minutos.' }
  }

  return { success: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.' }
}
