'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado / Sesión expirada' }

  const fullName = formData.get('fullName') as string
  if (!fullName || fullName.trim().length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres' }
  }

  // Upsert into public.profiles to support legacy users who don't have a row yet
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: fullName.trim(), updated_at: new Date().toISOString() })

  if (error) {
    console.error('[Profile Update] Backend Error:', error)
    return { error: 'No pudimos actualizar tu perfil en este momento. Reintenta más tarde.' }
  }

  // Update auth metadata to keep it synced globally
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { name: fullName.trim() }
  })
  if (authUpdateError) {
    console.error('[Profile Update] Auth metadata sync error:', authUpdateError)
    return { error: 'Perfil guardado parcialmente. No se pudo sincronizar tu cuenta. Intenta de nuevo.' }
  }

  // Force layout re-renders to show the new name in Navbar
  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  
  return { success: 'Perfil actualizado correctamente' }
}
