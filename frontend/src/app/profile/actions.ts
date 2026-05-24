'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isEmailVerified } from '@/lib/auth-user'
import { getBackendUrl } from '@/lib/backend-url'
import { DEVICE_ID_HEADER, isValidDeviceId } from '@/lib/device-session'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const MAX_PROFILE_NAME_LENGTH = 120

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
    return { error: 'Perfil guardado parcialmente. No se pudo sincronizar tu cuenta. Intenta de nuevo.' }
  }

  revalidatePath('/profile')
  revalidatePath('/', 'layout')

  return { success: 'Perfil actualizado correctamente.' }
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

  if (!UUID_REGEX.test(deviceId)) {
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
