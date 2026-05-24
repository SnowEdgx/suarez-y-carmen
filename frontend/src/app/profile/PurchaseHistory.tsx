import { CreditCard } from "lucide-react";
import Link from "next/link";
import { normalizeDisplayText } from "@/lib/display-text";
import type { PurchaseCard, PurchaseStatus } from "./profile-data";

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

export default function PurchaseHistory({ purchases }: { purchases: PurchaseCard[] }) {
  return (
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
            <h3 className="text-white font-medium mb-1">Cursos y compras</h3>
            <p className="text-neutral-500 text-xs">
              Aún no tienes cursos comprados. Explora los cursos y desbloquea el contenido cuando quieras.
            </p>
          </div>
          <Link
            href="/courses"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-center"
          >
            Ver cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const progressPercent = purchase.totalLessons > 0
              ? Math.round((purchase.completedLessons / purchase.totalLessons) * 100)
              : 0;
            const canOpenCourse = purchase.status === "paid" && purchase.course?.is_published;
            const courseTitle = normalizeDisplayText(purchase.course?.title, "Curso no disponible");
            const courseLevel = normalizeDisplayText(purchase.course?.level);

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
                      {courseLevel && (
                        <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-neutral-700 text-neutral-400">
                          {courseLevel}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg text-white font-semibold truncate">
                      {courseTitle}
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
                      Ver cursos
                    </Link>
                  )}
                </div>

                {purchase.status === "paid" && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                      <span>{purchase.completedLessons} de {purchase.totalLessons} lecciones completadas</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div
                      className="h-2 bg-neutral-800 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-label={`Progreso de ${courseTitle}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressPercent}
                    >
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
  );
}
