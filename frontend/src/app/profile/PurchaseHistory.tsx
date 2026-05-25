import { BookOpen } from "lucide-react";
import Link from "next/link";
import { normalizeDisplayText } from "@/lib/display-text";
import type { PurchaseCard, PurchaseStatus } from "./profile-data";

type ActiveCoursePurchase = PurchaseCard & {
  course: NonNullable<PurchaseCard["course"]>;
};

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
  if (status === "paid") return "Confirmado";
  if (status === "pending") return "En proceso";
  if (status === "refunded") return "Reembolsado";
  return "Cancelado";
}

function getStatusClass(status: PurchaseStatus) {
  if (status === "paid") return "border-green-500/20 bg-green-500/10 text-green-400";
  if (status === "pending") return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  return "border-neutral-700 bg-neutral-800 text-neutral-400";
}

function CourseProgress({ purchase, courseTitle }: { purchase: PurchaseCard; courseTitle: string }) {
  const progressPercent = purchase.totalLessons > 0
    ? Math.round((purchase.completedLessons / purchase.totalLessons) * 100)
    : 0;

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
        <span>{purchase.completedLessons} de {purchase.totalLessons} lecciones completadas</span>
        <span>{progressPercent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-neutral-800"
        role="progressbar"
        aria-label={`Progreso de ${courseTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div className="h-full bg-red-600" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

export default function PurchaseHistory({ purchases }: { purchases: PurchaseCard[] }) {
  const activePurchases = purchases.filter(
    (purchase): purchase is ActiveCoursePurchase => purchase.status === "paid" && Boolean(purchase.course?.is_published)
  );
  const activePurchaseIds = new Set(activePurchases.map((purchase) => purchase.id));
  const otherPurchases = purchases.filter((purchase) => !activePurchaseIds.has(purchase.id));

  return (
    <section
      id="my-courses"
      className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-sm sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <BookOpen className="text-red-500" aria-hidden="true" />
            Mis cursos
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
            Continúa tu formación y revisa el progreso de los cursos que ya tienes activos.
          </p>
        </div>
      </div>

      {activePurchases.length === 0 ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-black/30 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="mb-1 font-medium text-white">Todavía no tienes cursos activos</h3>
            <p className="text-xs text-neutral-500">
              Explora la academia y empieza con el contenido que quieras entrenar primero.
            </p>
          </div>
          <Link
            href="/courses"
            className="whitespace-nowrap rounded-full bg-red-600 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Ver cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activePurchases.map((purchase) => {
            const courseTitle = normalizeDisplayText(purchase.course.title, "Curso");
            const courseLevel = normalizeDisplayText(purchase.course.level);

            return (
              <article
                key={purchase.id}
                className="rounded-2xl border border-neutral-800 bg-black/30 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    {courseLevel && (
                      <span className="mb-2 inline-flex rounded-full border border-neutral-700 px-2.5 py-1 text-[11px] uppercase tracking-wide text-neutral-400">
                        {courseLevel}
                      </span>
                    )}
                    <h3 className="truncate text-lg font-semibold text-white">
                      {courseTitle}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Activado el {formatPurchaseDate(purchase.createdAt)}
                    </p>
                  </div>

                  <Link
                    href={`/courses/${purchase.course.slug}`}
                    className="rounded-full bg-red-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Continuar curso
                  </Link>
                </div>

                <CourseProgress purchase={purchase} courseTitle={courseTitle} />
              </article>
            );
          })}
        </div>
      )}

      {otherPurchases.length > 0 && (
        <details className="mt-6 rounded-2xl border border-neutral-800 bg-black/20 p-4">
          <summary className="cursor-pointer text-sm font-medium text-neutral-300">
            Ver historial adicional
          </summary>
          <div className="mt-4 space-y-3">
            {otherPurchases.map((purchase) => {
              const courseTitle = normalizeDisplayText(purchase.course?.title, "Curso no disponible");

              return (
                <div key={purchase.id} className="flex flex-col gap-2 border-t border-neutral-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-neutral-300">{courseTitle}</p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {formatCurrency(purchase.amountCents, purchase.currency)} · {formatPurchaseDate(purchase.createdAt)}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${getStatusClass(purchase.status)}`}>
                    {getStatusLabel(purchase.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
