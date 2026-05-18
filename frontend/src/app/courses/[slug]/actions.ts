'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

type LessonAccessRow = {
  id: string
  course_id: string
  courses: { slug: string; is_published: boolean } | { slug: string; is_published: boolean }[] | null
}

function getCourseSlug(rawSlug: FormDataEntryValue | null) {
  const slug = typeof rawSlug === 'string' ? rawSlug.trim() : ''
  return SLUG_REGEX.test(slug) ? slug : null
}

function getCoursePath(courseSlug: string | null) {
  if (!courseSlug) return '/courses'
  return `/courses/${courseSlug}`
}

function buildProgressPath(coursePath: string, code: string, lessonId?: string) {
  const separator = coursePath.includes('?') ? '&' : '?'
  const lessonParam = lessonId && UUID_REGEX.test(lessonId) ? `lesson=${encodeURIComponent(lessonId)}&` : ''
  return `${coursePath}${separator}${lessonParam}progress=${encodeURIComponent(code)}`
}

export async function setLessonProgress(formData: FormData) {
  const lessonId = typeof formData.get('lessonId') === 'string' ? (formData.get('lessonId') as string) : ''
  const courseSlug = getCourseSlug(formData.get('courseSlug'))
  const coursePath = getCoursePath(courseSlug)
  const shouldComplete = formData.get('completed') === 'true'

  if (!courseSlug || !UUID_REGEX.test(lessonId)) {
    redirect(buildProgressPath(coursePath, 'invalid_lesson'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(coursePath)}`)
  }

  const lessonAccess = await supabase
    .from('lessons')
    .select('id, course_id, courses!inner(slug, is_published)')
    .eq('id', lessonId)
    .eq('is_published', true)
    .maybeSingle()

  if (lessonAccess.error) {
    console.error('[Course Progress Action] Could not verify lesson access:', lessonAccess.error.message)
    redirect(buildProgressPath(coursePath, 'error', lessonId))
  }

  const lesson = lessonAccess.data as LessonAccessRow | null
  const course = Array.isArray(lesson?.courses) ? lesson?.courses[0] : lesson?.courses

  if (!lesson || !course?.is_published || course.slug !== courseSlug) {
    redirect(buildProgressPath(coursePath, 'access_denied', lessonId))
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
