'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getBackendUrl() {
  return process.env.BACKEND_URL ?? 'http://localhost:4000'
}

export async function startCourseCheckout(formData: FormData) {
  const courseId = formData.get('courseId')

  if (!courseId || typeof courseId !== 'string') {
    redirect('/courses?checkout=invalid_course')
  }

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (!user || !session?.access_token) {
    redirect(`/login?next=/courses`)
  }

  let response: Response
  try {
    response = await fetch(`${getBackendUrl()}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ courseId }),
      cache: 'no-store',
    })
  } catch {
    redirect('/courses?checkout=service_unavailable')
  }

  if (response.status === 409) {
    redirect('/courses?checkout=already_owned')
  }

  if (!response.ok) {
    redirect('/courses?checkout=error')
  }

  const payload = await response.json()
  if (!payload?.url) {
    redirect('/courses?checkout=error')
  }

  redirect(payload.url)
}
