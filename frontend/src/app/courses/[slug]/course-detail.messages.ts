import type { CheckoutMessage } from "@/lib/checkout-status";
import type { CourseDetailLesson } from "./course-detail.model";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveProgressMessage(code: string | null) {
  switch (code) {
    case "completed":
      return { type: "success" as const, text: "Lecci\u00f3n marcada como completada." };
    case "updated":
      return { type: "info" as const, text: "Progreso actualizado." };
    case "invalid_lesson":
      return { type: "error" as const, text: "No pudimos identificar la lecci\u00f3n seleccionada." };
    case "access_denied":
      return { type: "error" as const, text: "No tienes acceso para modificar el progreso de esta lecci\u00f3n." };
    case "error":
      return { type: "error" as const, text: "No pudimos guardar tu progreso. Int\u00e9ntalo de nuevo." };
    default:
      return null;
  }
}

export function resolveLessonMessage(options: {
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
