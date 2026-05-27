"use client";

import { useState } from "react";
import Link from "next/link";
import { normalizeDisplayText } from "@/lib/display-text";
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
  const [isOpen, setIsOpen] = useState(true);
  const coursePath = getCoursePath(course.slug);
  const completedCount = lessons.filter((l) => completedLessonSet.has(l.id)).length;
  const totalCount = lessons.length;
  const activeTitle = featuredLesson ? normalizeDisplayText(featuredLesson.title, "Lección") : "";

  return (
    <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      {/* Botón de cabecera para colapsar/desplegar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none cursor-pointer"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-xl font-semibold text-white">Lecciones</h2>
          <p className="mt-1 text-xs text-neutral-400">
            {completedCount} de {totalCount} completadas
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Lección activa destacada (solo se muestra cuando el acordeón está cerrado) */}
      {!isOpen && featuredLesson && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Clase seleccionada</p>
          <p className="mt-1 text-sm font-medium text-white">
            {featuredLesson.position}. {activeTitle}
          </p>
        </div>
      )}

      {/* Contenedor colapsable con animación */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 overflow-hidden"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {lessons.map((lesson) => {
              const isLocked = !hasPurchased && !lesson.is_free_preview;
              const isAccessible = accessibleLessonIds.has(lesson.id);
              const isCompleted = completedLessonSet.has(lesson.id);
              const isSelected = featuredLesson?.id === lesson.id;
              const lessonPath = getLessonPath(coursePath, lesson.id);
              const title = normalizeDisplayText(lesson.title, "Lección");

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
                          {lesson.position}. {title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{lesson.position}. {title}</p>
                      )}
                      {isCompleted && <p className="mt-1 text-xs text-green-400">Completada</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px] uppercase tracking-wide">
                        {lesson.is_free_preview ? "Vista previa" : isLocked ? "Bloqueada" : "Disponible"}
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
                                className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
        </div>
      </div>
    </aside>
  );
}
