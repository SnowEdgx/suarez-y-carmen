import Link from "next/link";
import SecureVideoPlayer from "@/components/courses/SecureVideoPlayer";
import { normalizeDisplayText } from "@/lib/display-text";
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
        className="h-2 overflow-hidden rounded-full bg-neutral-800"
        role="progressbar"
        aria-label="Progreso del curso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
      </div>
      <p className="mt-2 text-right text-xs text-neutral-500">{progressPercent}% completado</p>
    </div>
  );
}

function EmptyLessonState({
  lessons,
}: Pick<CourseDetailViewProps, "lessons">) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/35 p-6">
      {lessons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-neutral-300">Las lecciones completas se desbloquean al comprar el curso.</p>
          <p className="text-sm text-neutral-500">
            El acceso completo se activa desde el botón principal del curso.
          </p>
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
  isAuthenticated,
  featuredLesson,
  featuredLessonVideoUrl,
  featuredLessonVideoMessage,
  featuredLessonVideoErrorCode,
}: CourseDetailViewProps) {
  const accessibleLessonCount = accessibleLessonIds.size;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Lección seleccionada</h2>
          {isAuthenticated && accessibleLessonCount > 0 && (
            <p className="mt-1 text-sm text-neutral-500">
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
        <div className="grid items-start gap-6 md:grid-cols-[minmax(260px,440px)_minmax(0,1fr)]">
          {featuredLessonVideoUrl ? (
            <SecureVideoPlayer
              key={featuredLesson.id}
              src={featuredLessonVideoUrl}
              title={normalizeDisplayText(featuredLesson.title, "Lección")}
            />
          ) : (
            <div className="rounded-2xl border border-neutral-700 bg-black/60 p-6 text-sm text-neutral-400">
              <p>
                {featuredLessonVideoMessage ||
                  "No pudimos cargar el vídeo ahora mismo. Recarga la página en unos segundos."}
              </p>
              {featuredLessonVideoErrorCode === "device_limit_exceeded" && (
                <Link href="/profile" className="mt-4 inline-flex text-red-300 transition-colors hover:text-red-200">
                  Gestionar dispositivos
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/35 p-6">
            <h3 className="text-xl font-medium text-white">{normalizeDisplayText(featuredLesson.title, "Lección")}</h3>
            {featuredLesson.description && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{normalizeDisplayText(featuredLesson.description)}</p>
            )}

            {isAuthenticated && accessibleLessonIds.has(featuredLesson.id) && (
              <form action={setLessonProgress} className="mt-6">
                <input type="hidden" name="lessonId" value={featuredLesson.id} />
                <input type="hidden" name="courseSlug" value={course.slug} />
                <input
                  type="hidden"
                  name="completed"
                  value={completedLessonSet.has(featuredLesson.id) ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
                >
                  {completedLessonSet.has(featuredLesson.id) ? "Marcar como pendiente" : "Marcar como completada"}
                </button>
              </form>
            )}

            {!hasPurchased && previewLessons.length > 0 && (
              <p className="mt-6 text-xs leading-relaxed text-neutral-500">
                Estás viendo una vista previa. Compra el curso para desbloquear todas las lecciones.
              </p>
            )}
          </div>
        </div>
      ) : (
        <EmptyLessonState lessons={lessons} />
      )}
    </section>
  );
}
