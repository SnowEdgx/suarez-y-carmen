import type { createClient } from "@/lib/supabase/server";
import type { CheckoutMessage } from "@/lib/checkout-status";
import { logAppError } from "@/lib/error-logging";
import type { CourseDetailCourse, CourseDetailLesson } from "./course-detail.model";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ProgressRow = {
  lesson_id: string;
  is_completed: boolean;
};

export async function loadCourseMetadata(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("title, description, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logAppError("Course Metadata", "Could not load course metadata", error);
  }

  return data;
}

export async function loadPublishedCourse(supabase: SupabaseClient, slug: string) {
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
    return null;
  }

  return courseResponse.data as CourseDetailCourse;
}

export async function loadCourseLessons(supabase: SupabaseClient, courseId: string): Promise<{
  lessons: CourseDetailLesson[];
  message: CheckoutMessage | null;
}> {
  const lessonsResponse = await supabase
    .from("lessons")
    .select("id, title, description, position, is_free_preview")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (lessonsResponse.error) {
    logAppError("Course Detail", "Could not load lessons", lessonsResponse.error);
    return {
      lessons: [],
      message: {
        type: "error",
        text: "No pudimos cargar las lecciones del curso. Recarga la p\u00e1gina en unos segundos.",
      },
    };
  }

  return {
    lessons: (lessonsResponse.data || []) as CourseDetailLesson[],
    message: null,
  };
}

export async function resolveCoursePurchaseAccess(
  supabase: SupabaseClient,
  options: { userId: string | null; courseId: string }
): Promise<{
  hasPurchased: boolean;
  purchaseCheckUnavailable: boolean;
  message: CheckoutMessage | null;
}> {
  if (!options.userId) {
    return {
      hasPurchased: false,
      purchaseCheckUnavailable: false,
      message: null,
    };
  }

  const purchaseResponse = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", options.userId)
    .eq("course_id", options.courseId)
    .eq("status", "paid")
    .maybeSingle();

  if (purchaseResponse.error) {
    logAppError("Course Detail", "Could not verify course purchase", purchaseResponse.error);
    return {
      hasPurchased: false,
      purchaseCheckUnavailable: true,
      message: {
        type: "error",
        text: "No pudimos verificar tu acceso a este curso. Por seguridad, no se mostrar\u00e1 contenido privado hasta poder comprobarlo.",
      },
    };
  }

  return {
    hasPurchased: Boolean(purchaseResponse.data),
    purchaseCheckUnavailable: false,
    message: null,
  };
}

export async function loadCompletedLessonIds(
  supabase: SupabaseClient,
  options: { userId: string | null; accessibleLessons: CourseDetailLesson[] }
): Promise<{
  completedLessonIds: string[];
  message: CheckoutMessage | null;
}> {
  if (!options.userId || options.accessibleLessons.length === 0) {
    return {
      completedLessonIds: [],
      message: null,
    };
  }

  const progressResponse = await supabase
    .from("user_progress")
    .select("lesson_id, is_completed")
    .eq("user_id", options.userId)
    .in("lesson_id", options.accessibleLessons.map((lesson) => lesson.id))
    .eq("is_completed", true);

  if (progressResponse.error) {
    logAppError("Course Detail", "Could not load lesson progress", progressResponse.error);
    return {
      completedLessonIds: [],
      message: {
        type: "error",
        text: "No pudimos cargar tu progreso. Puedes seguir viendo las lecciones disponibles.",
      },
    };
  }

  return {
    completedLessonIds: ((progressResponse.data || []) as ProgressRow[]).map((progress) => progress.lesson_id),
    message: null,
  };
}
