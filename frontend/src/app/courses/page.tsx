import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import CourseGrid from '@/components/home/CourseGrid'
import {
  pickSingleParam,
  resolveCheckoutCodeMessage,
  resolveStripeReturnMessage,
  type CheckoutMessage,
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message)
  }
  return 'Unknown error'
}

function logCoursesPageError(context: string, error: unknown) {
  console.error(`[Courses Page] ${context}: ${getErrorMessage(error)}`)
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
  const pageMessages: CheckoutMessage[] = []

  if (shouldFallbackMissingPriceColumn(coursesResult.error)) {
    const fallback = await supabase
      .from('courses')
      .select('id, title, slug, description, level, cover_image_url, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (fallback.error) {
      logCoursesPageError('Could not load courses fallback', fallback.error)
      pageMessages.push({
        type: 'error',
        text: 'No pudimos cargar los cursos ahora mismo. Recarga la página en unos segundos.',
      })
    } else {
      courses = ((fallback.data || []) as CourseFallbackRow[]).map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level,
        cover_image_url: course.cover_image_url,
        price_cents: null,
      }))
    }
  } else if (coursesResult.error) {
    logCoursesPageError('Could not load courses', coursesResult.error)
    pageMessages.push({
      type: 'error',
      text: 'No pudimos cargar los cursos ahora mismo. Recarga la página en unos segundos.',
    })
  } else {
    courses = (coursesResult.data || []) as CourseRow[]
  }

  let purchasedCourseIds: string[] = []
  let purchaseStatusUnavailable = false

  if (user) {
    const purchases = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')

    if (!purchases.error) {
      purchasedCourseIds = (purchases.data || []).map((entry: { course_id: string }) => entry.course_id)
    } else {
      purchaseStatusUnavailable = true
      logCoursesPageError('Could not verify purchased courses', purchases.error)
      pageMessages.push({
        type: 'error',
        text: 'No pudimos verificar tus cursos comprados. Por seguridad, las compras quedan bloqueadas temporalmente.',
      })
    }
  }

  const bannerMessages = [checkoutMessage, stripeReturnMessage, ...pageMessages].filter(Boolean) as CheckoutMessage[]

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main id="main-content" className="pt-24 min-h-[80vh] bg-neutral-950 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 mb-8 text-center">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">Cursos</p>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">Academia Online</h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Explora el catálogo, visualiza previews públicas y compra solo los cursos que quieras.
          </p>
        </div>

        {bannerMessages.length > 0 && (
          <div className="mx-auto mb-8 max-w-3xl space-y-3">
            {bannerMessages.map((message) => (
              <div
                key={`${message.type}-${message.text}`}
                className={`rounded-xl border px-5 py-4 text-sm ${
                  message.type === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : message.type === 'success'
                      ? 'border-green-500/30 bg-green-500/10 text-green-200'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        )}

        <CourseGrid
          courses={courses}
          purchasedCourseIds={purchasedCourseIds}
          isAuthenticated={Boolean(user)}
          purchaseStatusUnavailable={purchaseStatusUnavailable}
        />
      </main>
      <Footer />
    </div>
  )
}
