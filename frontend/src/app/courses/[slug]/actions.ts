'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

function getCoursePath(rawSlug: FormDataEntryValue | null) {
  const slug = typeof rawSlug === 'string' ? rawSlug.trim() : ''
  if (!SLUG_REGEX.test(slug)) return '/courses'
  return `/courses/${slug}`
}

function buildProgressPath(coursePath: string, code: string, lessonId?: string) {
  const separator = coursePath.includes('?') ? '&' : '?'
  const lessonParam = lessonId && UUID_REGEX.test(lessonId) ? `lesson=${encodeURIComponent(lessonId)}&` : ''
  return `${coursePath}${separator}${lessonParam}progress=${encodeURIComponent(code)}`
}

export async function setLessonProgress(formData: FormData) {
  const lessonId = typeof formData.get('lessonId') === 'string' ? (formData.get('lessonId') as string) : ''
  const coursePath = getCoursePath(formData.get('courseSlug'))
  const shouldComplete = formData.get('completed') === 'true'

  if (!UUID_REGEX.test(lessonId)) {
    redirect(buildProgressPath(coursePath, 'invalid_lesson'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(coursePath)}`)
  }

  const { error } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        is_completed: shouldComplete,
        completed_at: shouldComplete ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) {
    console.error('[Course Progress Action] Failed to update lesson progress:', error.message)
    redirect(buildProgressPath(coursePath, 'error', lessonId))
  }

  revalidatePath(coursePath)
  redirect(buildProgressPath(coursePath, shouldComplete ? 'completed' : 'updated', lessonId))
}
