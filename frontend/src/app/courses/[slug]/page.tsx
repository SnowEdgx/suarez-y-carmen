import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import {
  pickSingleParam,
  resolveCheckoutCodeMessage,
  resolveStripeReturnMessage,
  type CheckoutMessage,
} from "@/lib/checkout-status";
import { DEVICE_ID_HEADER } from "@/lib/device-session";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";
import CourseDetailView from "./CourseDetailView";
import {
  getCoursePath,
  getLessonPath,
  type CourseDetailCourse,
  type CourseDetailLesson,
} from "./course-detail.model";
import { resolveLessonVideoAccess, resolveVideoAccessMessage } from "./video-access";

type ProgressRow = {
  lesson_id: string;
  is_completed: boolean;
};

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<CourseDetailPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("title, description, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logAppError("Course Metadata", "Could not load course metadata", error);
  }

  if (!data?.is_published) {
    return {
      title: "Curso no encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    data.description || "Curso online de bachata de Suárez y Carmen con acceso controlado al contenido completo.";

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      type: "article",
    },
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveProgressMessage(code: string | null) {
  switch (code) {
    case "completed":
      return { type: "success" as const, text: "Lecci\u00f3n marcada como completada." };
    case "updated":
      return { type: "info" as const, text: "Progreso actualizado." };
    case "invalid_lesson":
      return { type: "error" as const, text: "No pudimos identificar la lecci\u00f3n seleccionada." };
    case "access_denied":
      return { type: "error" as const, text: "No tienes acceso para modificar el progreso de esta lección." };
    case "error":
      return { type: "error" as const, text: "No pudimos guardar tu progreso. Int\u00e9ntalo de nuevo." };
    default:
      return null;
  }
}

function resolveLessonMessage(options: {
  requestedLessonId: string | null;
  requestedLesson: CourseDetailLesson | null;
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
  const requestHeaders = await headers();
  const deviceId = requestHeaders.get(DEVICE_ID_HEADER);
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

  if (courseResponse.error) {
    logAppError("Course Detail", "Could not load course", courseResponse.error);
    throw new Error("Course detail load failed.");
  }

  if (!courseResponse.data || !courseResponse.data.is_published) {
    notFound();
  }

  const course = courseResponse.data as CourseDetailCourse;
  const loadMessages: CheckoutMessage[] = [];

  const lessonsResponse = await supabase
    .from("lessons")
    .select("id, title, description, position, is_free_preview")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  let lessons: CourseDetailLesson[] = [];
  if (lessonsResponse.error) {
    logAppError("Course Detail", "Could not load lessons", lessonsResponse.error);
    loadMessages.push({
      type: "error",
      text: "No pudimos cargar las lecciones del curso. Recarga la página en unos segundos.",
    });
  } else {
    lessons = (lessonsResponse.data || []) as CourseDetailLesson[];
  }

  let hasPurchased = false;
  let purchaseCheckUnavailable = false;
  if (user) {
    const purchaseResponse = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("status", "paid")
      .maybeSingle();

    if (purchaseResponse.error) {
      purchaseCheckUnavailable = true;
      logAppError("Course Detail", "Could not verify course purchase", purchaseResponse.error);
      loadMessages.push({
        type: "error",
        text: "No pudimos verificar tu acceso a este curso. Por seguridad, no se mostrará contenido privado hasta poder comprobarlo.",
      });
    } else {
      hasPurchased = Boolean(purchaseResponse.data);
    }
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
  const featuredLessonVideoAccess = featuredLesson
    ? await resolveLessonVideoAccess({
        lessonId: featuredLesson.id,
        accessToken,
        deviceId,
      })
    : { url: null, errorCode: null };
  const featuredLessonVideoUrl = featuredLessonVideoAccess.url;
  const featuredLessonVideoMessage = resolveVideoAccessMessage(featuredLessonVideoAccess.errorCode);
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
    } else {
      logAppError("Course Detail", "Could not load lesson progress", progressResponse.error);
      loadMessages.push({
        type: "error",
        text: "No pudimos cargar tu progreso. Puedes seguir viendo las lecciones disponibles.",
      });
    }
  }

  const completedLessonSet = new Set(completedLessonIds);
  const completedAccessibleLessons = accessibleLessons.filter((lesson) => completedLessonSet.has(lesson.id)).length;
  const progressPercent =
    accessibleLessons.length > 0 ? Math.round((completedAccessibleLessons / accessibleLessons.length) * 100) : 0;
  const statusMessages = [checkoutMessage, stripeReturnMessage, progressMessage, lessonMessage, ...loadMessages].filter(
    Boolean
  ) as CheckoutMessage[];
  const coursePath = getCoursePath(course.slug);
  const selectedLessonPath = featuredLesson ? getLessonPath(coursePath, featuredLesson.id) : coursePath;
  const checkoutReturnPath = requestedLesson ? getLessonPath(coursePath, requestedLesson.id) : selectedLessonPath;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <CourseDetailView
        course={course}
        lessons={lessons}
        previewLessons={previewLessons}
        accessibleLessonIds={accessibleLessonIds}
        completedLessonSet={completedLessonSet}
        completedAccessibleLessons={completedAccessibleLessons}
        progressPercent={progressPercent}
        hasPurchased={hasPurchased}
        hasValidPrice={hasValidPrice}
        purchaseCheckUnavailable={purchaseCheckUnavailable}
        isAuthenticated={Boolean(user)}
        featuredLesson={featuredLesson}
        featuredLessonVideoUrl={featuredLessonVideoUrl}
        featuredLessonVideoMessage={featuredLessonVideoMessage}
        featuredLessonVideoErrorCode={featuredLessonVideoAccess.errorCode}
        statusMessages={statusMessages}
        checkoutReturnPath={checkoutReturnPath}
      />
      <Footer />
    </div>
  );
}
