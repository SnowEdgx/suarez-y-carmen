'use server'

import { revalidatePath } from 'next/cache'
import { headers, cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isEmailVerified } from '@/lib/auth-user'
import { getBackendUrl } from '@/lib/backend-url'
import { DEVICE_ID_HEADER, isValidDeviceId } from '@/lib/device-session'
import { getSiteUrl } from '@/lib/site-url'
import {
  AUTH_SESSION_PREFERENCE_COOKIE,
  getExpiredSessionPreferenceCookieOptions,
} from '@/lib/auth-session'
import { isUuid } from '@/lib/uuid'

const MAX_PROFILE_NAME_LENGTH = 120

function isEmailRateLimitError(error: { status?: number; code?: string; message?: string }) {
  const code = error.code?.toLowerCase() ?? ''
  const message = error.message?.toLowerCase() ?? ''

  return error.status === 429 || code.includes('rate') || message.includes('rate limit')
}

function getRecoveryRedirectUrl() {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
}

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' }
  }

  if (!isEmailVerified(user)) {
    return { error: 'Verifica tu correo antes de modificar tu perfil.' }
  }

  const fullName = typeof formData.get('fullName') === 'string' ? (formData.get('fullName') as string).trim() : ''
  if (fullName.length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres.' }
  }
  if (fullName.length > MAX_PROFILE_NAME_LENGTH) {
    return { error: 'El nombre no puede superar 120 caracteres.' }
  }

  // Upsert supports legacy users that may not have a profile row yet.
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() })

  if (error) {
    console.error('[Profile Update] Could not update profile:', error.message)
    return { error: 'No pudimos actualizar tu perfil en este momento. Reintenta más tarde.' }
  }

  // Keep auth metadata aligned so navbar/profile names stay in sync.
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { name: fullName },
  })

  if (authUpdateError) {
    console.error('[Profile Update] Could not sync auth metadata:', authUpdateError.message)
  }

  revalidatePath('/profile')
  revalidatePath('/', 'layout')

  return { success: 'Perfil actualizado correctamente.' }
}

export async function requestOwnPasswordChange() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' }
  }

  if (!isEmailVerified(user)) {
    return { error: 'Verifica tu correo antes de cambiar la contraseña.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: getRecoveryRedirectUrl(),
  })

  if (error) {
    console.error('[Profile Password Change] Could not request password change:', error.message)
    if (isEmailRateLimitError(error)) {
      return { error: 'Has solicitado un correo hace poco. Espera unos minutos antes de intentarlo de nuevo.' }
    }

    return { error: 'No pudimos enviar el enlace ahora mismo. Inténtalo de nuevo en unos minutos.' }
  }

  return { success: 'Te hemos enviado un enlace seguro para cambiar la contraseña.' }
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function revokeVideoDevice(formData: FormData) {
  const deviceId = typeof formData.get('deviceId') === 'string' ? formData.get('deviceId') as string : ''

  if (!isUuid(deviceId)) {
    return { error: 'No pudimos identificar el dispositivo.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!user || !session?.access_token) {
    return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' }
  }

  if (!isEmailVerified(user)) {
    return { error: 'Verifica tu correo antes de gestionar dispositivos.' }
  }

  const requestHeaders = await headers()
  const currentDeviceId = requestHeaders.get(DEVICE_ID_HEADER)
  if (!isValidDeviceId(currentDeviceId)) {
    return { error: 'No pudimos validar este dispositivo. Recarga la página e inténtalo de nuevo.' }
  }

  let response: Response
  try {
    response = await fetch(`${getBackendUrl()}/api/video-devices/${encodeURIComponent(deviceId)}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        [DEVICE_ID_HEADER]: currentDeviceId,
      },
      cache: 'no-store',
    })
  } catch {
    return { error: 'No pudimos contactar con el servicio de dispositivos.' }
  }

  if (!response.ok) {
    const payload = await readJsonSafely(response)
    return {
      error:
        typeof payload?.error === 'string'
          ? payload.error
          : 'No pudimos revocar el dispositivo. Inténtalo de nuevo.',
    }
  }

  revalidatePath('/profile')
  return { success: 'Dispositivo revocado correctamente.' }
}

/**
 * Solicita el borrado de cuenta al backend Express.
 */
export async function requestAccountDeletionAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!user || !session?.access_token) {
    return { error: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' }
  }

  if (!isEmailVerified(user)) {
    return { error: 'Verifica tu correo antes de solicitar el borrado de tu cuenta.' }
  }

  let response: Response
  try {
    response = await fetch(`${getBackendUrl()}/api/users/request-delete-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    })
  } catch {
    return { error: 'No pudimos conectar con el servidor para procesar la solicitud.' }
  }

  const payload = await readJsonSafely(response)
  if (!response.ok) {
    return {
      error: typeof payload?.error === 'string' ? payload.error : 'No pudimos solicitar el borrado de la cuenta.',
    }
  }

  return { success: typeof payload?.message === 'string' ? payload.message : 'Correo enviado correctamente.' }
}

/**
 * Confirma el borrado definitivo de cuenta en el backend Express
 * y cierra la sesión en el cliente Next.js.
 */
export async function confirmAccountDeletionAction(token: string) {
  if (!token) {
    return { error: 'Token de confirmación no proporcionado.' }
  }

  let response: Response
  try {
    response = await fetch(`${getBackendUrl()}/api/users/confirm-delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    })
  } catch {
    return { error: 'No pudimos conectar con el servidor para confirmar el borrado.' }
  }

  const payload = await readJsonSafely(response)
  if (!response.ok) {
    return {
      error: typeof payload?.error === 'string' ? payload.error : 'No pudimos eliminar tu cuenta.',
    }
  }

  // Cerrar la sesión del usuario del lado del cliente si el borrado fue exitoso
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.set(
    AUTH_SESSION_PREFERENCE_COOKIE,
    '',
    getExpiredSessionPreferenceCookieOptions()
  )

  revalidatePath('/', 'layout')
  return { success: true }
}
