import Link from "next/link";
import SecureVideoPlayer from "@/components/courses/SecureVideoPlayer";
import { normalizeDisplayText } from "@/lib/display-text";
import { startCourseCheckout } from "../actions";
import { setLessonProgress } from "./actions";
import type { CourseDetailViewProps } from "./course-detail.model";

function LessonProgressSummary({
  isAuthenticated,
  accessibleLessonCount,
  progressPercent,
}: {
  isAuthenticated: boolean;
  accessibleLessonCount: number;
  progressPercent: number;
}) {
  if (!isAuthenticated || accessibleLessonCount === 0) return null;

  return (
    <div className="w-full sm:w-44">
      <div
        className="h-2 rounded-full bg-neutral-800 overflow-hidden"
        role="progressbar"
        aria-label="Progreso del curso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-neutral-500 text-right">{progressPercent}% completado</p>
    </div>
  );
}

function EmptyLessonState({
  lessons,
  course,
  hasPurchased,
  hasValidPrice,
  purchaseCheckUnavailable,
  isAuthenticated,
  checkoutReturnPath,
}: Pick<
  CourseDetailViewProps,
  "lessons" | "course" | "hasPurchased" | "hasValidPrice" | "purchaseCheckUnavailable" | "isAuthenticated" | "checkoutReturnPath"
>) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-6">
      {lessons.length > 0 ? (
        <div className="space-y-4">
          <p className="text-neutral-300">Las lecciones completas se desbloquean al comprar el curso.</p>
          {!hasPurchased && hasValidPrice && !purchaseCheckUnavailable && (
            isAuthenticated ? (
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
  );
}

export default function SelectedLessonPanel({
  course,
  lessons,
  previewLessons,
  accessibleLessonIds,
  completedLessonSet,
  completedAccessibleLessons,
  progressPercent,
  hasPurchased,
  hasValidPrice,
  purchaseCheckUnavailable,
  isAuthenticated,
  featuredLesson,
  featuredLessonVideoUrl,
  featuredLessonVideoMessage,
  featuredLessonVideoErrorCode,
  checkoutReturnPath,
}: CourseDetailViewProps) {
  const accessibleLessonCount = accessibleLessonIds.size;

  return (
    <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Lección seleccionada</h2>
          {isAuthenticated && accessibleLessonCount > 0 && (
            <p className="text-sm text-neutral-500 mt-1">
              {completedAccessibleLessons} de {accessibleLessonCount} lecciones completadas
            </p>
          )}
        </div>

        <LessonProgressSummary
          isAuthenticated={isAuthenticated}
          accessibleLessonCount={accessibleLessonCount}
          progressPercent={progressPercent}
        />
      </div>

      {featuredLesson ? (
        <div className="space-y-4">
          <h3 className="text-xl text-white font-medium">{normalizeDisplayText(featuredLesson.title, "Lección")}</h3>
          {featuredLesson.description && (
            <p className="text-neutral-400 text-sm">{normalizeDisplayText(featuredLesson.description)}</p>
          )}
          {featuredLessonVideoUrl ? (
            <SecureVideoPlayer
              key={featuredLesson.id}
              src={featuredLessonVideoUrl}
              title={normalizeDisplayText(featuredLesson.title, "Lección")}
            />
          ) : (
            <div className="rounded-xl border border-neutral-700 bg-black/60 p-6 text-sm text-neutral-400">
              <p>
                {featuredLessonVideoMessage ||
                  "No pudimos cargar el vídeo ahora mismo. Recarga la página en unos segundos."}
              </p>
              {featuredLessonVideoErrorCode === "device_limit_exceeded" && (
                <Link href="/profile" className="mt-4 inline-flex text-red-300 hover:text-red-200 transition-colors">
                  Gestionar dispositivos
                </Link>
              )}
            </div>
          )}
          {isAuthenticated && accessibleLessonIds.has(featuredLesson.id) && (
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
                {completedLessonSet.has(featuredLesson.id) ? "Marcar como pendiente" : "Marcar como completada"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <EmptyLessonState
          lessons={lessons}
          course={course}
          hasPurchased={hasPurchased}
          hasValidPrice={hasValidPrice}
          purchaseCheckUnavailable={purchaseCheckUnavailable}
          isAuthenticated={isAuthenticated}
          checkoutReturnPath={checkoutReturnPath}
        />
      )}

      {!hasPurchased && previewLessons.length > 0 && (
        <p className="mt-4 text-xs text-neutral-500">
          Estás viendo contenido de preview. Compra el curso para desbloquear todas las lecciones.
        </p>
      )}
    </div>
  );
}
