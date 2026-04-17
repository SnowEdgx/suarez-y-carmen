import Image from "next/image";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { startCourseCheckout } from "@/app/courses/actions";

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
  isAuthenticated: boolean;
}

function formatPrice(priceCents: number | null) {
  if (!Number.isInteger(priceCents ?? null)) return "Precio no disponible";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format((priceCents as number) / 100);
}

export default function CourseGrid({ courses, purchasedCourseIds, isAuthenticated }: CourseGridProps) {
  const purchasedSet = new Set(purchasedCourseIds);

  return (
    <section id="courses" className="py-24 px-6 md:px-12 bg-black/40">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">Catalogo de Cursos</h2>
            <p className="text-neutral-400 text-lg max-w-2xl">
              Descubre el estilo de Suarez y Carmen con cursos por niveles. Puedes explorar el catalogo antes de comprar.
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-neutral-400">
            No hay cursos publicados por ahora. Vuelve pronto.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => {
              const isOwned = purchasedSet.has(course.id);
              const hasPrice = Number.isInteger(course.price_cents) && (course.price_cents as number) > 0;

              return (
                <article key={course.id} className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex flex-col min-h-[420px]">
                  <div className="relative aspect-[3/4] bg-neutral-950">
                    <Image
                      src={
                        course.cover_image_url ||
                        "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=900&auto=format&fit=crop"
                      }
                      alt={course.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-75 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <PlayCircle className="w-14 h-14 text-white drop-shadow-2xl" />
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-5">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 block">{course.level || "Curso"}</span>
                      <h3 className="text-xl font-bold text-white leading-tight">{course.title}</h3>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm text-neutral-400 line-clamp-3 min-h-[60px]">
                      {course.description || "Contenido premium para mejorar tecnica, musicalidad y conexion."}
                    </p>

                    <p className="text-white font-semibold">{formatPrice(course.price_cents)}</p>

                    <div className="mt-auto space-y-3">
                      {isOwned ? (
                        <Link
                          href={`/courses/${course.slug}`}
                          className="w-full text-center py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors block"
                        >
                          Ver curso
                        </Link>
                      ) : !hasPrice ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 bg-neutral-800 text-neutral-400 font-semibold rounded-lg cursor-not-allowed"
                        >
                          Compra no disponible
                        </button>
                      ) : isAuthenticated ? (
                        <form action={startCourseCheckout}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="returnTo" value="/courses" />
                          <button
                            type="submit"
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            Comprar curso
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/login?next=/courses/${course.slug}`}
                          className="w-full text-center py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors block"
                        >
                          Inicia sesion para comprar
                        </Link>
                      )}

                      <Link
                        href={`/courses/${course.slug}`}
                        className="w-full text-center py-2.5 border border-neutral-700 text-neutral-200 hover:text-white hover:border-neutral-500 rounded-lg transition-colors block"
                      >
                        Ver detalle y previews
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
