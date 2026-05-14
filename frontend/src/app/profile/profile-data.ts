import "server-only";

import { getBackendUrl } from "@/lib/backend-url";
import { DEVICE_ID_HEADER, isValidDeviceId } from "@/lib/device-session";
import { createClient } from "@/lib/supabase/server";

export type PurchaseStatus = "pending" | "paid" | "refunded" | "canceled";

type PurchasedCourse = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  is_published: boolean;
};

export type PurchaseCard = {
  id: string;
  status: PurchaseStatus;
  createdAt: string | null;
  amountCents: number | null;
  currency: string | null;
  course: PurchasedCourse | null;
  totalLessons: number;
  completedLessons: number;
};

type VideoDevice = {
  id: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
  isActive: boolean;
};

export type VideoDevicesResponse = {
  devices: VideoDevice[];
  activeDeviceCount: number;
  maxActiveDevices: number;
  loadError: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function normalizePurchaseStatus(status: unknown): PurchaseStatus {
  return status === "paid" || status === "refunded" || status === "canceled" ? status : "pending";
}

function normalizeCourse(rawCourse: unknown): PurchasedCourse | null {
  if (!rawCourse || typeof rawCourse !== "object") return null;
  const course = Array.isArray(rawCourse) ? rawCourse[0] : rawCourse;
  if (!course || typeof course !== "object") return null;

  const value = course as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.title !== "string" || typeof value.slug !== "string") {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    slug: value.slug,
    level: typeof value.level === "string" ? value.level : null,
    is_published: Boolean(value.is_published),
  };
}

async function loadVideoDevices(accessToken: string | null, deviceId: string | null): Promise<VideoDevicesResponse> {
  const fallback = {
    devices: [],
    activeDeviceCount: 0,
    maxActiveDevices: 2,
    loadError: "No pudimos cargar tus dispositivos de vídeo.",
  };

  if (!accessToken || !isValidDeviceId(deviceId)) {
    return fallback;
  }

  try {
    const response = await fetch(`${getBackendUrl()}/api/video-devices`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        [DEVICE_ID_HEADER]: deviceId,
      },
      cache: "no-store",
    });

    if (!response.ok) return fallback;

    const payload = await response.json() as Partial<VideoDevicesResponse>;
    return {
      devices: Array.isArray(payload.devices) ? payload.devices : [],
      activeDeviceCount: Number.isInteger(payload.activeDeviceCount) ? payload.activeDeviceCount as number : 0,
      maxActiveDevices: Number.isInteger(payload.maxActiveDevices) ? payload.maxActiveDevices as number : 2,
      loadError: null,
    };
  } catch {
    return fallback;
  }
}

async function loadPurchasesWithProgress(supabase: SupabaseServerClient, userId: string): Promise<PurchaseCard[]> {
  const purchasesResponse = await supabase
    .from("user_courses")
    .select("id, status, created_at, amount_cents, currency, course:courses(id, title, slug, level, is_published)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rawPurchases = (purchasesResponse.data || []) as Array<Record<string, unknown>>;
  const purchasedCourseIds = rawPurchases
    .map((purchase) => normalizeCourse(purchase.course)?.id)
    .filter((courseId): courseId is string => Boolean(courseId));

  const lessonsResponse = purchasedCourseIds.length > 0
    ? await supabase
      .from("lessons")
      .select("id, course_id")
      .in("course_id", purchasedCourseIds)
      .eq("is_published", true)
    : { data: [] as Array<{ id: string; course_id: string }> };

  const lessonRows = (lessonsResponse.data || []) as Array<{ id: string; course_id: string }>;
  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const progressResponse = lessonIds.length > 0
    ? await supabase
      .from("user_progress")
      .select("lesson_id")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds)
      .eq("is_completed", true)
    : { data: [] as Array<{ lesson_id: string }> };

  const completedLessonIds = new Set(
    ((progressResponse.data || []) as Array<{ lesson_id: string }>).map((progress) => progress.lesson_id)
  );
  const totalLessonsByCourse = new Map<string, number>();
  const completedLessonsByCourse = new Map<string, number>();

  for (const lesson of lessonRows) {
    totalLessonsByCourse.set(lesson.course_id, (totalLessonsByCourse.get(lesson.course_id) || 0) + 1);
    if (completedLessonIds.has(lesson.id)) {
      completedLessonsByCourse.set(lesson.course_id, (completedLessonsByCourse.get(lesson.course_id) || 0) + 1);
    }
  }

  return rawPurchases.map((purchase) => {
    const course = normalizeCourse(purchase.course);

    return {
      id: typeof purchase.id === "string" ? purchase.id : crypto.randomUUID(),
      status: normalizePurchaseStatus(purchase.status),
      createdAt: typeof purchase.created_at === "string" ? purchase.created_at : null,
      amountCents: Number.isInteger(purchase.amount_cents) ? purchase.amount_cents as number : null,
      currency: typeof purchase.currency === "string" ? purchase.currency : null,
      course,
      totalLessons: course ? totalLessonsByCourse.get(course.id) || 0 : 0,
      completedLessons: course ? completedLessonsByCourse.get(course.id) || 0 : 0,
    };
  });
}

export async function loadProfilePageData(options: {
  supabase: SupabaseServerClient;
  userId: string;
  accessToken: string | null;
  currentDeviceId: string | null;
}) {
  const { supabase, userId, accessToken, currentDeviceId } = options;

  const [{ data: profile }, purchases, videoDevices] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    loadPurchasesWithProgress(supabase, userId),
    loadVideoDevices(accessToken, currentDeviceId),
  ]);

  return {
    profile,
    purchases,
    activeCourseCount: purchases.filter((purchase) => purchase.status === "paid" && purchase.course).length,
    videoDevices,
  };
}
