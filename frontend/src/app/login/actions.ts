'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.warn("[Login Action] Login failed for email:", data.email);
    return { error: 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.' }
  }

  revalidatePath('/', 'layout')
  redirect('/courses')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string;
  if(password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  const data = {
    email: formData.get('email') as string,
    password: password,
    options: {
      data: {
        name: formData.get('name') as string,
      }
    }
  }

  const { error, data: resData } = await supabase.auth.signUp(data)

  if (error) {
    console.error("[Login Action] Signup error details:", error);
    return { error: 'Ocurrió un error al procesar tu solicitud. Por favor, reintenta más tarde o contáctanos si el problema persiste.' }
  }

  revalidatePath('/', 'layout')
  redirect('/courses')
}
