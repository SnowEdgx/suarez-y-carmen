import Link from "next/link";
import Image from "next/image";
import { PlayCircle } from "lucide-react";
import { getCourseImageUrl, shouldBypassImageOptimization } from "@/lib/course-images";
import { normalizeDisplayText } from "@/lib/display-text";

type CourseItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  cover_image_url: string | null;
  price_cents: number | null;
};

interface CourseGridProps {
  courses: CourseItem[];
  purchasedCourseIds: string[];
}

function formatPrice(priceCents: number | null) {
  if (!Number.isInteger(priceCents ?? null)) return "Precio no disponible";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format((priceCents as number) / 100);
}

function getCoursePath(slug: string) {
  return `/courses/${encodeURIComponent(slug)}`;
}

export default function CourseGrid({
  courses,
  purchasedCourseIds,
}: CourseGridProps) {
  const purchasedSet = new Set(purchasedCourseIds);

  return (
    <section id="courses" className="py-24 px-6 md:px-12 bg-black/40" aria-labelledby="courses-heading">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 id="courses-heading" className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">Cursos</h2>
            <p className="text-neutral-400 text-lg max-w-3xl text-pretty">
              Revisa el contenido, mira las vistas previas y avanza con una ruta clara de entrenamiento.
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-left text-neutral-400">
            No hay cursos publicados por ahora. Vuelve pronto.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, index) => {
              const isOwned = purchasedSet.has(course.id);
              const imageSrc = getCourseImageUrl(course.cover_image_url);
              const coursePath = getCoursePath(course.slug);
              const title = normalizeDisplayText(course.title, "Curso");
              const level = normalizeDisplayText(course.level, "Curso");
              const description = normalizeDisplayText(
                course.description,
                "Contenido completo para mejorar técnica, musicalidad y conexión."
              );

              return (
                <article key={course.id} className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex flex-col min-h-[420px]">
                  <div className="relative isolate aspect-[3/4] shrink-0 overflow-hidden bg-neutral-950">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt=""
                        aria-hidden="true"
                        fill
                        priority={index < 2}
                        quality={74}
                        unoptimized={shouldBypassImageOptimization(imageSrc)}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="h-full w-full object-cover object-[center_28%] opacity-75 transition-opacity duration-500 group-hover:opacity-100"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[radial-gradient(circle_at_28%_16%,rgba(220,38,38,0.38),transparent_32%),linear-gradient(145deg,#171717,#050505)]"
                      />
                    )}
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>

                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <PlayCircle className="w-14 h-14 text-white drop-shadow-2xl" aria-hidden="true" />
                    </div>

                    <div className="absolute bottom-0 left-0 z-20 w-full p-5">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 block">{level}</span>
                      <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
                    </div>
                  </div>

                  <div className="relative z-30 bg-neutral-900 p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm text-neutral-400 line-clamp-3 min-h-[60px]">
                      {description}
                    </p>

                    <p className="text-white font-semibold">{formatPrice(course.price_cents)}</p>

                    <div className="mt-auto">
                      <Link
                        href={coursePath}
                        className={`block w-full rounded-lg py-3 text-center font-semibold transition-colors ${
                          isOwned
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {isOwned ? "Continuar curso" : "Ver detalle y vistas previas"}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
