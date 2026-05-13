import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import SecureVideoPlayer from "@/components/courses/SecureVideoPlayer";
import {
  pickSingleParam,
  resolveCheckoutCodeMessage,
  resolveStripeReturnMessage,
  type CheckoutMessage,
} from "@/lib/checkout-status";
import { getBackendUrl, getPublicBackendUrl } from "@/lib/backend-url";
import { getCourseImageUrl, shouldBypassImageOptimization } from "@/lib/course-images";
import { createClient } from "@/lib/supabase/server";
import { startCourseCheckout } from "../actions";
import { setLessonProgress } from "./actions";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  cover_image_url: string | null;
  price_cents: number | null;
  is_published: boolean;
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_free_preview: boolean;
};

type ProgressRow = {
  lesson_id: string;
  is_completed: boolean;
};

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatPrice(priceCents: number | null) {
  if (!Number.isInteger(priceCents ?? null) || (priceCents as number) <= 0) {
    return "Precio no disponible";
  }
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format((priceCents as number) / 100);
}

async function resolveLessonVideoUrl(options: {
  lessonId: string;
  accessToken: string | null;
}) {
  const { lessonId, accessToken } = options;
  const headers: HeadersInit = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/lessons/${encodeURIComponent(lessonId)}/video-url`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (typeof payload?.path === "string" && payload.path.startsWith("/")) {
    return `${getPublicBackendUrl()}${payload.path}`;
  }

  return typeof payload?.url === "string" ? payload.url : null;
}

function resolveProgressMessage(code: string | null) {
  switch (code) {
    case "completed":
      return { type: "success" as const, text: "Lecci\u00f3n marcada como completada." };
    case "updated":
      return { type: "info" as const, text: "Progreso actualizado." };
    case "invalid_lesson":
      return { type: "error" as const, text: "No pudimos identificar la lecci\u00f3n seleccionada." };
    case "error":
      return { type: "error" as const, text: "No pudimos guardar tu progreso. Int\u00e9ntalo de nuevo." };
    default:
      return null;
  }
}

function resolveLessonMessage(options: {
  requestedLessonId: string | null;
  requestedLesson: LessonRow | null;
  isRequestedLessonAccessible: boolean;
}): CheckoutMessage | null {
  const { requestedLessonId, requestedLesson, isRequestedLessonAccessible } = options;

  if (!requestedLessonId) return null;

  if (!UUID_REGEX.test(requestedLessonId)) {
    return { type: "error", text: "No pudimos abrir la lecci\u00f3n seleccionada." };
  }

  if (!requestedLesson) {
    return { type: "error", text: "La lecci\u00f3n seleccionada no est\u00e1 disponible." };
  }

  if (!isRequestedLessonAccessible) {
    return { type: "info", text: "Esta lecci\u00f3n forma parte del contenido completo del curso." };
  }

  return null;
}

export default async function CourseDetailPage({ params, searchParams }: CourseDetailPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const progressMessage = resolveProgressMessage(pickSingleParam(resolvedSearchParams?.progress));
  const checkoutMessage = resolveCheckoutCodeMessage(pickSingleParam(resolvedSearchParams?.checkout));
  const stripeSuccessParam = pickSingleParam(resolvedSearchParams?.success);
  const stripeCanceledParam = pickSingleParam(resolvedSearchParams?.canceled);
  const stripeSessionId = pickSingleParam(resolvedSearchParams?.session_id);
  const requestedLessonId = pickSingleParam(resolvedSearchParams?.lesson);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token ?? null;
  const stripeReturnMessage = await resolveStripeReturnMessage({
    sessionId: stripeSessionId,
    wasSuccessful: stripeSuccessParam === "true",
    wasCanceled: stripeCanceledParam === "true",
    accessToken,
  });

  const courseResponse = await supabase
    .from("courses")
    .select("id, title, slug, description, level, cover_image_url, price_cents, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (courseResponse.error || !courseResponse.data || !courseResponse.data.is_published) {
    notFound();
  }

  const course = courseResponse.data as CourseRow;

  const lessonsResponse = await supabase
    .from("lessons")
    .select("id, title, description, position, is_free_preview")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  const lessons = (lessonsResponse.data || []) as LessonRow[];

  let hasPurchased = false;
  if (user) {
    const purchaseResponse = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("status", "paid")
      .maybeSingle();

    hasPurchased = Boolean(purchaseResponse.data) && !purchaseResponse.error;
  }

  const previewLessons = lessons.filter((lesson) => lesson.is_free_preview);
  const accessibleLessons = hasPurchased ? lessons : previewLessons;
  const accessibleLessonIds = new Set(accessibleLessons.map((lesson) => lesson.id));
  const requestedLesson =
    requestedLessonId && UUID_REGEX.test(requestedLessonId)
      ? lessons.find((lesson) => lesson.id === requestedLessonId) ?? null
      : null;
  const isRequestedLessonAccessible = Boolean(
    requestedLesson && accessibleLessonIds.has(requestedLesson.id)
  );
  const lessonMessage = resolveLessonMessage({
    requestedLessonId,
    requestedLesson,
    isRequestedLessonAccessible,
  });
  const featuredLesson = isRequestedLessonAccessible ? requestedLesson : accessibleLessons[0] ?? null;
  const featuredLessonVideoUrl = featuredLesson
    ? await resolveLessonVideoUrl({
        lessonId: featuredLesson.id,
        accessToken,
      })
    : null;
  const hasValidPrice = Number.isInteger(course.price_cents) && (course.price_cents as number) > 0;

  let completedLessonIds: string[] = [];
  if (user && accessibleLessons.length > 0) {
    const progressResponse = await supabase
      .from("user_progress")
      .select("lesson_id, is_completed")
      .eq("user_id", user.id)
      .in("lesson_id", accessibleLessons.map((lesson) => lesson.id))
      .eq("is_completed", true);

    if (!progressResponse.error) {
      completedLessonIds = ((progressResponse.data || []) as ProgressRow[]).map((progress) => progress.lesson_id);
    }
  }

  const completedLessonSet = new Set(completedLessonIds);
  const completedAccessibleLessons = accessibleLessons.filter((lesson) => completedLessonSet.has(lesson.id)).length;
  const progressPercent =
    accessibleLessons.length > 0 ? Math.round((completedAccessibleLessons / accessibleLessons.length) * 100) : 0;
  const imageSrc = getCourseImageUrl(course.cover_image_url);
  const statusMessages = [checkoutMessage, stripeReturnMessage, progressMessage, lessonMessage].filter(
    Boolean
  ) as CheckoutMessage[];
  const coursePath = `/courses/${course.slug}`;
  const selectedLessonPath = featuredLesson ? `${coursePath}?lesson=${featuredLesson.id}` : coursePath;
  const checkoutReturnPath = requestedLesson ? `${coursePath}?lesson=${requestedLesson.id}` : selectedLessonPath;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />

      <main className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <Link href="/courses" className="text-sm text-neutral-400 hover:text-white transition-colors">
          Volver al catálogo
        </Link>

        {statusMessages.length > 0 && (
          <div className="mt-6 space-y-3">
            {statusMessages.map((message) => (
              <div
                key={`${message.type}-${message.text}`}
                className={`rounded-xl border px-5 py-4 text-sm ${
                  message.type === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : message.type === "success"
                      ? "border-green-500/30 bg-green-500/10 text-green-200"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-200"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        )}

        <header className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <span className="inline-block text-xs uppercase tracking-wider text-red-500 font-semibold mb-3">
              {course.level || "Curso"}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-4">{course.title}</h1>
            <p className="text-neutral-400 text-lg leading-relaxed">
              {course.description || "Entrena t\u00e9cnica, musicalidad y conexi\u00f3n con metodolog\u00eda profesional."}
            </p>

            <div className="mt-8 space-y-3">
              <p className="text-2xl font-bold text-white">{formatPrice(course.price_cents)}</p>

              {hasPurchased ? (
                <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
                  Curso adquirido
                </p>
              ) : !hasValidPrice ? (
                <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-neutral-800 border border-neutral-700 text-neutral-400">
                  Compra no disponible temporalmente
                </p>
              ) : user ? (
                <form action={startCourseCheckout}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="returnTo" value={checkoutReturnPath} />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Comprar curso
                  </button>
                </form>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(checkoutReturnPath)}`}
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Inicia sesión para comprar
                </Link>
              )}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50 min-h-[420px]">
            <Image
              src={imageSrc}
              alt={course.title}
              fill
              unoptimized={shouldBypassImageOptimization(imageSrc)}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full h-full object-cover"
            />
          </div>
        </header>

        <section className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Lección seleccionada</h2>
                {user && accessibleLessons.length > 0 && (
                  <p className="text-sm text-neutral-500 mt-1">
                    {completedAccessibleLessons} de {accessibleLessons.length} lecciones completadas
                  </p>
                )}
              </div>

              {user && accessibleLessons.length > 0 && (
                <div className="w-full sm:w-44">
                  <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-500 text-right">{progressPercent}% completado</p>
                </div>
              )}
            </div>

            {featuredLesson ? (
              <div className="space-y-4">
                <h3 className="text-xl text-white font-medium">{featuredLesson.title}</h3>
                {featuredLesson.description && (
                  <p className="text-neutral-400 text-sm">{featuredLesson.description}</p>
                )}
                {featuredLessonVideoUrl ? (
                  <SecureVideoPlayer
                    key={featuredLesson.id}
                    src={featuredLessonVideoUrl}
                    title={featuredLesson.title}
                  />
                ) : (
                  <div className="rounded-xl border border-neutral-700 bg-black/60 p-6 text-sm text-neutral-400">
                    No pudimos cargar el vídeo ahora mismo. Recarga la página en unos segundos.
                  </div>
                )}
                {user && accessibleLessonIds.has(featuredLesson.id) && (
                  <form action={setLessonProgress}>
                    <input type="hidden" name="lessonId" value={featuredLesson.id} />
                    <input type="hidden" name="courseSlug" value={course.slug} />
                    <input
                      type="hidden"
                      name="completed"
                      value={completedLessonSet.has(featuredLesson.id) ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
                    >
                      {completedLessonSet.has(featuredLesson.id)
                        ? "Marcar como pendiente"
                        : "Marcar como completada"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6">
                {lessons.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-neutral-300">
                      Las lecciones completas se desbloquean al comprar el curso.
                    </p>
                    {!hasPurchased && hasValidPrice && (
                      user ? (
                        <form action={startCourseCheckout}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="returnTo" value={checkoutReturnPath} />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                          >
                            Comprar curso
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/login?next=${encodeURIComponent(checkoutReturnPath)}`}
                          className="inline-block px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                        >
                          Inicia sesión para comprar
                        </Link>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-400">Aún no hay lecciones disponibles para este curso.</p>
                )}
              </div>
            )}

            {!hasPurchased && previewLessons.length > 0 && (
              <p className="mt-4 text-xs text-neutral-500">
                Estás viendo contenido de preview. Compra el curso para desbloquear todas las lecciones.
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Lecciones</h2>
            <ul className="space-y-3">
              {lessons.map((lesson) => {
                const isLocked = !hasPurchased && !lesson.is_free_preview;
                const isAccessible = accessibleLessonIds.has(lesson.id);
                const isCompleted = completedLessonSet.has(lesson.id);
                const isSelected = featuredLesson?.id === lesson.id;
                const lessonPath = `${coursePath}?lesson=${lesson.id}`;

                return (
                  <li
                    key={lesson.id}
                    className={`rounded-lg border px-4 py-3 ${
                      isSelected
                        ? "border-red-500/40 bg-red-500/10 text-white"
                        : isLocked
                        ? "border-neutral-800 bg-neutral-900/40 text-neutral-500"
                        : "border-neutral-700 bg-neutral-900/70 text-neutral-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {isAccessible ? (
                          <Link href={lessonPath} className="text-sm font-medium hover:text-white transition-colors">
                            {lesson.position}. {lesson.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{lesson.position}. {lesson.title}</p>
                        )}
                        {isCompleted && (
                          <p className="mt-1 text-xs text-green-400">Completada</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[11px] uppercase tracking-wide">
                          {lesson.is_free_preview ? "Preview" : isLocked ? "Bloqueada" : "Disponible"}
                        </span>
                        {isAccessible && (
                          <>
                            {!isSelected && (
                              <Link href={lessonPath} className="text-[11px] text-neutral-400 hover:text-white transition-colors">
                                Ver lección
                              </Link>
                            )}
                            {user && (
                              <form action={setLessonProgress}>
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <input type="hidden" name="courseSlug" value={course.slug} />
                                <input type="hidden" name="completed" value={isCompleted ? "false" : "true"} />
                                <button
                                  type="submit"
                                  className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                                >
                                  {isCompleted ? "Reabrir" : "Completar"}
                                </button>
                              </form>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
