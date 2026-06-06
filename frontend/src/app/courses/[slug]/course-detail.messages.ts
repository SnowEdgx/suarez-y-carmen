import type { CheckoutMessage } from "@/lib/checkout-status";
import { isUuid, UUID_REGEX } from "@/lib/uuid";
import type { CourseDetailLesson } from "./course-detail.model";

export { UUID_REGEX };

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

  if (!isUuid(requestedLessonId)) {
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
