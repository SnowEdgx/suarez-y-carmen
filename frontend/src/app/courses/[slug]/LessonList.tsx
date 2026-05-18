import Link from "next/link";
import { setLessonProgress } from "./actions";
import { getCoursePath, getLessonPath, type CourseDetailViewProps } from "./course-detail.model";

type LessonListProps = Pick<
  CourseDetailViewProps,
  "course" | "lessons" | "hasPurchased" | "accessibleLessonIds" | "completedLessonSet" | "featuredLesson" | "isAuthenticated"
>;

export default function LessonList({
  course,
  lessons,
  hasPurchased,
  accessibleLessonIds,
  completedLessonSet,
  featuredLesson,
  isAuthenticated,
}: LessonListProps) {
  const coursePath = getCoursePath(course.slug);

  return (
    <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Lecciones</h2>
      <ul className="space-y-3">
        {lessons.map((lesson) => {
          const isLocked = !hasPurchased && !lesson.is_free_preview;
          const isAccessible = accessibleLessonIds.has(lesson.id);
          const isCompleted = completedLessonSet.has(lesson.id);
          const isSelected = featuredLesson?.id === lesson.id;
          const lessonPath = getLessonPath(coursePath, lesson.id);

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
                  {isCompleted && <p className="mt-1 text-xs text-green-400">Completada</p>}
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
                      {isAuthenticated && (
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
  );
}
