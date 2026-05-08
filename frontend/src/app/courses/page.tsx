import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import CourseGrid from '@/components/home/CourseGrid'
import {
  pickSingleParam,
  resolveCheckoutCodeMessage,
  resolveStripeReturnMessage,
} from '@/lib/checkout-status'
import { createClient } from '@/lib/supabase/server'

type CourseRow = {
  id: string
  title: string
  slug: string
  description: string | null
  level: string | null
  cover_image_url: string | null
  price_cents: number | null
}

type CourseFallbackRow = Omit<CourseRow, 'price_cents'> & {
  is_published: boolean
}

type CoursesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function shouldFallbackMissingPriceColumn(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false
  if (error.code === '42703') return true
  const combined = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return combined.includes('price_cents')
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = searchParams ? await searchParams : {}
  const checkoutParam = pickSingleParam(params?.checkout)
  const checkoutMessage = resolveCheckoutCodeMessage(checkoutParam)

  const stripeSuccessParam = pickSingleParam(params?.success)
  const stripeCanceledParam = pickSingleParam(params?.canceled)
  const stripeSessionId = pickSingleParam(params?.session_id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token ?? null

  const stripeReturnMessage = await resolveStripeReturnMessage({
    sessionId: stripeSessionId,
    wasSuccessful: stripeSuccessParam === 'true',
    wasCanceled: stripeCanceledParam === 'true',
    accessToken,
  })

  const coursesResult = await supabase
    .from('courses')
    .select('id, title, slug, description, level, cover_image_url, price_cents, is_published')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  let courses: CourseRow[] = []

  if (shouldFallbackMissingPriceColumn(coursesResult.error)) {
    const fallback = await supabase
      .from('courses')
      .select('id, title, slug, description, level, cover_image_url, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    courses = ((fallback.data || []) as CourseFallbackRow[]).map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      cover_image_url: course.cover_image_url,
      price_cents: null,
    }))
  } else {
    courses = (coursesResult.data || []) as CourseRow[]
  }

  let purchasedCourseIds: string[] = []

  if (user) {
    const purchases = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')

    if (!purchases.error) {
      purchasedCourseIds = (purchases.data || []).map((entry: { course_id: string }) => entry.course_id)
    }
  }

  const bannerMessage = checkoutMessage ?? stripeReturnMessage

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main className="pt-24 min-h-[80vh] bg-neutral-950 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 mb-8 text-center">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">Acceso por curso</p>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">Academia Online</h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Explora el catálogo, visualiza previews públicas y compra solo los cursos que quieras.
          </p>
        </div>

        {bannerMessage && (
          <div
            className={`max-w-3xl mx-auto mb-8 rounded-xl border px-5 py-4 text-sm ${
              bannerMessage.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : bannerMessage.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-200'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
            }`}
          >
            {bannerMessage.text}
          </div>
        )}

        <CourseGrid
          courses={courses}
          purchasedCourseIds={purchasedCourseIds}
          isAuthenticated={Boolean(user)}
        />
      </main>
      <Footer />
    </div>
  )
}
