import Image from "next/image";
import Link from "next/link";
import { getCourseImageUrl, shouldBypassImageOptimization } from "@/lib/course-images";
import { normalizeDisplayText } from "@/lib/display-text";
import { startCourseCheckout } from "../actions";
import type { CourseDetailViewProps } from "./course-detail.model";

type CourseHeroProps = Pick<
  CourseDetailViewProps,
  "course" | "hasPurchased" | "hasValidPrice" | "purchaseCheckUnavailable" | "isAuthenticated" | "checkoutReturnPath"
>;

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

export default function CourseHero({
  course,
  hasPurchased,
  hasValidPrice,
  purchaseCheckUnavailable,
  isAuthenticated,
  checkoutReturnPath,
}: CourseHeroProps) {
  const imageSrc = getCourseImageUrl(course.cover_image_url);
  const title = normalizeDisplayText(course.title, "Curso");
  const level = normalizeDisplayText(course.level, "Curso");
  const description = normalizeDisplayText(
    course.description,
    "Entrena técnica, musicalidad y conexión con una progresión clara."
  );

  return (
    <header className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div>
        <span className="inline-block text-xs uppercase tracking-wider text-red-500 font-semibold mb-3">
          {level}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-4">{title}</h1>
        <p className="text-neutral-400 text-lg leading-relaxed">{description}</p>

        <div className="mt-8 space-y-3">
          <p className="text-2xl font-bold text-white">{formatPrice(course.price_cents)}</p>

          {hasPurchased ? (
            <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
              Curso adquirido
            </p>
          ) : purchaseCheckUnavailable ? (
            <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-neutral-800 border border-neutral-700 text-neutral-400">
              Compra no disponible hasta verificar tu acceso
            </p>
          ) : !hasValidPrice ? (
            <p className="inline-flex px-3 py-1.5 rounded-full text-xs bg-neutral-800 border border-neutral-700 text-neutral-400">
              Compra no disponible temporalmente
            </p>
          ) : isAuthenticated ? (
            <form action={startCourseCheckout}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="returnTo" value={checkoutReturnPath} />
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Comprar curso
              </button>
            </form>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(checkoutReturnPath)}`}
              className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Inicia sesión para comprar
            </Link>
          )}
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50 min-h-[420px]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title}
            fill
            priority
            quality={76}
            unoptimized={shouldBypassImageOptimization(imageSrc)}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="w-full h-full object-cover object-[center_24%]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end bg-[radial-gradient(circle_at_30%_18%,rgba(220,38,38,0.34),transparent_34%),linear-gradient(145deg,#171717,#050505)] p-8">
            <p className="font-serif text-3xl font-bold text-white/90">Curso online</p>
          </div>
        )}
      </div>
    </header>
  );
}
