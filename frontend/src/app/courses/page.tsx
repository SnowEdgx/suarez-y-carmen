import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import CourseGrid from '@/components/home/CourseGrid'
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

type CheckoutMessage = {
  type: 'error' | 'info' | 'success'
  text: string
}

function getBackendUrl() {
  return process.env.BACKEND_URL ?? 'http://localhost:4000'
}

function pickSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function shouldFallbackMissingPriceColumn(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false
  if (error.code === '42703') return true
  const combined = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return combined.includes('price_cents')
}

function resolveCheckoutCodeMessage(code: string | null): CheckoutMessage | null {
  switch (code) {
    case 'already_owned':
      return { type: 'info', text: 'Ya tienes acceso a este curso. Puedes abrirlo desde el catalogo.' }
    case 'invalid_course':
      return { type: 'error', text: 'El curso seleccionado no es valido.' }
    case 'course_not_found':
      return { type: 'error', text: 'No hemos encontrado ese curso o ya no esta disponible.' }
    case 'service_unavailable':
      return { type: 'error', text: 'No pudimos contactar con el servicio de pago. Intentalo de nuevo en unos minutos.' }
    case 'rate_limited':
      return { type: 'error', text: 'Has realizado demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.' }
    case 'forbidden':
      return { type: 'error', text: 'No tienes permisos para completar esta operacion.' }
    case 'error':
      return { type: 'error', text: 'No se pudo iniciar el checkout. Vuelve a intentarlo.' }
    default:
      return null
  }
}

async function resolveStripeReturnMessage(options: {
  sessionId: string | null
  wasSuccessful: boolean
  wasCanceled: boolean
  accessToken: string | null
}): Promise<CheckoutMessage | null> {
  const { sessionId, wasSuccessful, wasCanceled, accessToken } = options

  if (wasCanceled) {
    return {
      type: 'info',
      text: 'Checkout cancelado. Puedes volver a intentarlo cuando quieras.',
    }
  }

  if (!wasSuccessful) {
    return null
  }

  if (!sessionId) {
    return {
      type: 'info',
      text: 'Pago recibido. Estamos validando tu acceso, recarga la pagina en unos segundos.',
    }
  }

  if (!accessToken) {
    return {
      type: 'error',
      text: 'Tu sesion no esta activa. Inicia sesion para confirmar tu acceso al curso comprado.',
    }
  }

  let response: Response
  try {
    response = await fetch(
      `${getBackendUrl()}/api/stripe/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    )
  } catch {
    return {
      type: 'error',
      text: 'No pudimos verificar el estado del pago en este momento. Recarga la pagina en unos segundos.',
    }
  }

  let payload: Record<string, unknown> | null = null
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    payload = null
  }

  if (response.status === 401) {
    return {
      type: 'error',
      text: 'Tu sesion ha caducado. Inicia sesion de nuevo para ver tus cursos.',
    }
  }

  if (response.status === 403 || response.status === 404) {
    return {
      type: 'error',
      text: 'No pudimos verificar esta sesion de checkout para tu usuario.',
    }
  }

  if (!response.ok) {
    return {
      type: 'error',
      text: 'No pudimos validar el pago ahora mismo. Recarga la pagina en unos segundos.',
    }
  }

  const status = typeof payload?.status === 'string' ? payload.status : null
  const accessGranted = Boolean(payload?.accessGranted)

  if (status === 'paid' && accessGranted) {
    return {
      type: 'success',
      text: 'Pago confirmado. Tu acceso al curso ya esta activo.',
    }
  }

  if (status === 'paid' && !accessGranted) {
    return {
      type: 'info',
      text: 'Pago confirmado, pero el acceso aun se esta sincronizando. Recarga en unos segundos.',
    }
  }

  if (status === 'pending') {
    return {
      type: 'info',
      text: 'El pago sigue en proceso. Te avisaremos cuando quede confirmado.',
    }
  }

  if (status === 'canceled') {
    return {
      type: 'info',
      text: 'La sesion de pago no se ha completado. Puedes volver a intentarlo cuando quieras.',
    }
  }

  return {
    type: 'error',
    text: 'Estado de checkout no reconocido. Contacta soporte si el acceso no aparece.',
  }
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
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
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
            Explora el catalogo, visualiza previews publicas y compra solo los cursos que quieras.
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
