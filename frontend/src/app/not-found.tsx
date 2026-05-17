import Link from "next/link";
import Footer from "@/components/home/Footer";
import Navbar from "@/components/home/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-6 pt-32 pb-20">
        <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 text-center shadow-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-red-400">
            Página no encontrada
          </p>
          <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">
            Esta página no está disponible
          </h1>
          <p className="mt-5 text-neutral-400">
            Puede que el contenido se haya movido, esté pendiente de publicación o la dirección no sea correcta.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/courses"
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Ver cursos
            </Link>
            <Link
              href="/"
              className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
