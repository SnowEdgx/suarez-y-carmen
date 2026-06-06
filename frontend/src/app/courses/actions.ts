'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isEmailVerified } from '@/lib/auth-user'
import { getBackendUrl } from '@/lib/backend-url'
import { getSafeCoursePath } from '@/lib/safe-redirect'

function buildPathWithCheckoutCode(pathname: string, code: string) {
  const separator = pathname.includes('?') ? '&' : '?'
  return `${pathname}${separator}checkout=${encodeURIComponent(code)}`
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function startCourseCheckout(formData: FormData) {
  const courseId = formData.get('courseId')
  const returnTo = getSafeCoursePath(formData.get('returnTo'), '/courses')

  if (!courseId || typeof courseId !== 'string') {
    redirect(buildPathWithCheckoutCode(returnTo, 'invalid_course'))
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!user || !session?.access_token) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  }

  if (!isEmailVerified(user)) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}&error=verify_email_required`)
  }

  let response: Response
  try {
    response = await fetch(`${getBackendUrl()}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ courseId, returnPath: returnTo }),
      cache: 'no-store',
    })
  } catch {
    redirect(buildPathWithCheckoutCode(returnTo, 'service_unavailable'))
  }

  if (response.status === 401) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  }

  if (response.status === 409) {
    redirect(buildPathWithCheckoutCode(returnTo, 'already_owned'))
  }

  if (response.status === 404) {
    redirect(buildPathWithCheckoutCode(returnTo, 'course_not_found'))
  }

  if (response.status === 400) {
    redirect(buildPathWithCheckoutCode(returnTo, 'invalid_course'))
  }

  if (response.status === 429) {
    redirect(buildPathWithCheckoutCode(returnTo, 'rate_limited'))
  }

  if (response.status === 503) {
    redirect(buildPathWithCheckoutCode(returnTo, 'service_unavailable'))
  }

  if (response.status === 403) {
    const payload = await readJsonSafely(response)
    const backendCode = typeof payload?.code === 'string' ? payload.code : ''

    if (backendCode === 'email_not_verified') {
      redirect(`/login?next=${encodeURIComponent(returnTo)}&error=verify_email_required`)
    }
    if (backendCode === 'course_unavailable') {
      redirect(buildPathWithCheckoutCode(returnTo, 'course_not_found'))
    }

    redirect(buildPathWithCheckoutCode(returnTo, 'forbidden'))
  }

  if (!response.ok) {
    redirect(buildPathWithCheckoutCode(returnTo, 'error'))
  }

  const payload = await readJsonSafely(response)
  if (!payload?.url || typeof payload.url !== 'string') {
    redirect(buildPathWithCheckoutCode(returnTo, 'error'))
  }

  redirect(payload.url)
}
