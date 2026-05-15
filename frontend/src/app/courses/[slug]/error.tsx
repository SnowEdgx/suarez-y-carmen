"use client";

import Link from "next/link";

export default function CourseDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main-content" className="min-h-screen bg-neutral-950 px-6 py-24 text-neutral-100">
      <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">Curso no disponible</p>
        <h1 className="mt-4 text-3xl font-serif font-bold text-white">
          No pudimos cargar este curso ahora mismo
        </h1>
        <p className="mt-4 text-sm leading-6 text-neutral-400">
          Puede ser un problema temporal de conexión o carga de datos. Recarga la página y, si continúa, vuelve al
          catálogo para probar con otro curso.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Reintentar
          </button>
          <Link
            href="/courses"
            className="rounded-lg border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
          >
            Volver al catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}
