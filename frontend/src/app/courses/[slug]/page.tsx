import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import { startCourseCheckout } from "../actions";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  cover_image_url: string | null;
  price_cents: number | null;
  is_published: boolean;
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  position: number;
  is_free_preview: boolean;
};

function formatPrice(priceCents: number | null) {
  if (!Number.isInteger(priceCents ?? null) || (priceCents as number) <= 0) {
    return "Precio no disponible";
  }
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format((priceCents as number) / 100);
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const courseResponse = await supabase
    .from("courses")
    .select("id, title, slug, description, level, cover_image_url, price_cents, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (courseResponse.error || !courseResponse.data || !courseResponse.data.is_published) {
    notFound();
  }

  const course = courseResponse.data as CourseRow;

  const lessonsResponse = await supabase
    .from("lessons")
    .select("id, title, description, video_url, position, is_free_preview")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  const lessons = (lessonsResponse.data || []) as LessonRow[];

  let hasPurchased = false;
  if (user) {
    const purchaseResponse = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .eq("status", "paid")
      .maybeSingle();

    hasPurchased = Boolean(purchaseResponse.data) && !purchaseResponse.error;
  }

  const previewLessons = lessons.filter((lesson) => lesson.is_free_preview);
  const accessibleLessons = hasPurchased ? lessons : previewLessons;
  const featuredLesson = accessibleLessons[0] ?? null;
  const hasValidPrice = Number.isInteger(course.price_cents) && (course.price_cents as number) > 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />

      <main className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <Link href="/courses" className="text-sm text-neutral-400 hover:text-white transition-colors">
          ? Volver al catalogo
        </Link>

        <header className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <span className="inline-block text-xs uppercase tracking-wider text-red-500 font-semibold mb-3">
              {course.level || "Curso"}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-4">{course.title}</h1>
            <p className="text-neutral-400 text-lg leading-relaxed">
              {course.description || "Entrena tecnica, musicalidad y conexion con metodologia profesional."}
            </p>

            <div className="mt-8 space-y-3">
              <p className="text-2xl font-bold text-white">{formatPrice(course.price_cents)}</p>

              {hasPurchased ? (
                <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
                  Curso adquirido
                </p>
              ) : !hasValidPrice ? (
                <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-neutral-800 border border-neutral-700 text-neutral-400">
                  Compra no disponible temporalmente
                </p>
              ) : user ? (
                <form action={startCourseCheckout}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="returnTo" value={`/courses/${course.slug}`} />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Comprar curso
                  </button>
                </form>
              ) : (
                <Link
                  href={`/login?next=/courses/${course.slug}`}
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Inicia sesion para comprar
                </Link>
              )}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50 min-h-[420px]">
            <Image
              src={
                course.cover_image_url ||
                "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=1200&auto=format&fit=crop"
              }
              alt={course.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full h-full object-cover"
            />
          </div>
        </header>

        <section className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Leccion destacada</h2>

            {featuredLesson ? (
              <div className="space-y-4">
                <h3 className="text-xl text-white font-medium">{featuredLesson.title}</h3>
                {featuredLesson.description && (
                  <p className="text-neutral-400 text-sm">{featuredLesson.description}</p>
                )}
                <video
                  key={featuredLesson.id}
                  controls
                  preload="metadata"
                  className="w-full rounded-xl border border-neutral-700 bg-black"
                  src={featuredLesson.video_url}
                />
              </div>
            ) : (
              <p className="text-neutral-400">Aun no hay lecciones disponibles para este curso.</p>
            )}

            {!hasPurchased && previewLessons.length > 0 && (
              <p className="mt-4 text-xs text-neutral-500">
                Estas viendo contenido de preview. Compra el curso para desbloquear todas las lecciones.
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Lecciones</h2>
            <ul className="space-y-3">
              {lessons.map((lesson) => {
                const isLocked = !hasPurchased && !lesson.is_free_preview;

                return (
                  <li
                    key={lesson.id}
                    className={`rounded-lg border px-4 py-3 ${
                      isLocked
                        ? "border-neutral-800 bg-neutral-900/40 text-neutral-500"
                        : "border-neutral-700 bg-neutral-900/70 text-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{lesson.position}. {lesson.title}</p>
                      <span className="text-[11px] uppercase tracking-wide">
                        {lesson.is_free_preview ? "Preview" : isLocked ? "Premium" : "Disponible"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
