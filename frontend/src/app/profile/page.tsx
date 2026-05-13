import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import { getBackendUrl } from "@/lib/backend-url";
import { DEVICE_ID_HEADER, isValidDeviceId } from "@/lib/device-session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import VideoDevicesPanel from "./VideoDevicesPanel";
import { BookOpen, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";

type PurchaseStatus = "pending" | "paid" | "refunded" | "canceled";

type PurchasedCourse = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  is_published: boolean;
};

type PurchaseCard = {
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

type VideoDevicesResponse = {
  devices: VideoDevice[];
  activeDeviceCount: number;
  maxActiveDevices: number;
  loadError: string | null;
};

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

function formatCurrency(amountCents: number | null, currency: string | null) {
  if (!Number.isInteger(amountCents ?? null) || (amountCents as number) <= 0) return "Importe no disponible";

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    minimumFractionDigits: 0,
  }).format((amountCents as number) / 100);
}

function formatPurchaseDate(value: string | null) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: PurchaseStatus) {
  if (status === "paid") return "Acceso activo";
  if (status === "pending") return "Pago pendiente";
  if (status === "refunded") return "Reembolsado";
  return "Cancelado";
}

function getStatusClass(status: PurchaseStatus) {
  if (status === "paid") return "border-green-500/20 bg-green-500/10 text-green-400";
  if (status === "pending") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  return "border-neutral-700 bg-neutral-800 text-neutral-400";
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

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const requestHeaders = await headers();
  const currentDeviceId = requestHeaders.get(DEVICE_ID_HEADER);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name || user.user_metadata?.name || "Usuario";

  const purchasesResponse = await supabase
    .from("user_courses")
    .select("id, status, created_at, amount_cents, currency, course:courses(id, title, slug, level, is_published)")
    .eq("user_id", user.id)
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
      .eq("user_id", user.id)
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

  const purchases: PurchaseCard[] = rawPurchases.map((purchase) => {
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

  const activeCourseCount = purchases.filter((purchase) => purchase.status === "paid" && purchase.course).length;
  const videoDevices = await loadVideoDevices(session?.access_token ?? null, currentDeviceId);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col pt-24">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-10 relative z-10">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Mi perfil</h1>
        <p className="text-neutral-400 mb-10">
          Gestiona tus datos personales, tus compras y el progreso de tus cursos.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6">Información personal</h2>
              <ProfileForm initialName={fullName} email={user.email || ""} />
            </section>

            <VideoDevicesPanel
              devices={videoDevices.devices}
              activeDeviceCount={videoDevices.activeDeviceCount}
              maxActiveDevices={videoDevices.maxActiveDevices}
              loadError={videoDevices.loadError}
            />

            <section
              id="payments"
              className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CreditCard className="text-[#635BFF]" />
                  Pagos y acceso
                </h2>
                <span className="text-xs bg-[#635BFF]/10 text-[#635BFF] px-3 py-1.5 rounded-full font-medium w-fit border border-[#635BFF]/20">
                  Pago singular por curso
                </span>
              </div>
              <p className="text-neutral-400 text-sm mb-6 max-w-xl">
                La pasarela de pago se procesa de forma segura con Stripe. La plataforma no guarda datos de tarjeta y el acceso al
                curso se activa automáticamente tras confirmarse el pago.
              </p>

              {purchases.length === 0 ? (
                <div className="border border-neutral-700/50 rounded-2xl p-6 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">Catálogo y compras</h3>
                    <p className="text-neutral-500 text-xs">
                      Aún no tienes cursos comprados. Explora el catálogo y desbloquea el contenido cuando quieras.
                    </p>
                  </div>
                  <Link
                    href="/courses"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-center"
                  >
                    Ir al catálogo
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase) => {
                    const progressPercent = purchase.totalLessons > 0
                      ? Math.round((purchase.completedLessons / purchase.totalLessons) * 100)
                      : 0;
                    const canOpenCourse = purchase.status === "paid" && purchase.course?.is_published;

                    return (
                      <article
                        key={purchase.id}
                        className="rounded-2xl border border-neutral-800 bg-black/35 p-5"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${getStatusClass(purchase.status)}`}>
                                {getStatusLabel(purchase.status)}
                              </span>
                              {purchase.course?.level && (
                                <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-neutral-700 text-neutral-400">
                                  {purchase.course.level}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg text-white font-semibold truncate">
                              {purchase.course?.title || "Curso no disponible"}
                            </h3>
                            <p className="mt-1 text-xs text-neutral-500">
                              {formatCurrency(purchase.amountCents, purchase.currency)} · {formatPurchaseDate(purchase.createdAt)}
                            </p>
                          </div>

                          {canOpenCourse ? (
                            <Link
                              href={`/courses/${purchase.course?.slug}`}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-center"
                            >
                              Continuar curso
                            </Link>
                          ) : (
                            <Link
                              href="/courses"
                              className="px-4 py-2 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-center"
                            >
                              Ver catálogo
                            </Link>
                          )}
                        </div>

                        {purchase.status === "paid" && (
                          <div className="mt-5">
                            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                              <span>{purchase.completedLessons} de {purchase.totalLessons} lecciones completadas</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                        )}

                        {purchase.status === "pending" && (
                          <p className="mt-4 text-xs text-blue-200/80">
                            El pago está pendiente de confirmación. Si ya lo completaste, vuelve a cargar la página en unos segundos.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 backdrop-blur-sm sticky top-32">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl font-bold shadow-lg border border-red-500/30">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-lg leading-tight">{fullName}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    {activeCourseCount > 0 ? `${activeCourseCount} curso${activeCourseCount === 1 ? "" : "s"} activo${activeCourseCount === 1 ? "" : "s"}` : "Alumno registrado"}
                  </p>
                </div>
              </div>
              <hr className="border-neutral-800 my-5" />
              <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 p-4 rounded-2xl mb-4">
                <BookOpen className="text-red-500 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  <strong className="text-red-400 font-medium">Cursos activos:</strong> {activeCourseCount}. El acceso se calcula desde tus compras confirmadas.
                </p>
              </div>
              <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/10 p-4 rounded-2xl">
                <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  <strong className="text-green-500/90 font-medium">Cuenta protegida.</strong> Tus sesiones y permisos se gestionan con
                  Supabase Auth y políticas RLS.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
