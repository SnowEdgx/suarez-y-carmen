import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import Navbar from "@/components/home/Navbar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Correo verificado",
  description: "Confirmación de correo completada en la academia Suárez y Carmen.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VerifiedEmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const primaryHref = user ? "/courses" : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100 selection:bg-red-600 selection:text-white">
      <Navbar user={user} />

      <main id="main-content" className="relative z-10 flex flex-1 items-center px-6 pb-20 pt-32 md:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_18%,rgba(220,38,38,0.2),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.2),#0a0a0a)]" />

        <section className="relative mx-auto w-full max-w-2xl border-y border-neutral-800 bg-neutral-950/80 py-10 lg:border lg:p-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
            Cuenta confirmada
          </p>
          <h1 className="mb-5 font-serif text-4xl font-bold tracking-tight text-white md:text-6xl">
            Correo verificado correctamente.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
            Tu cuenta ya está activa. Puedes iniciar sesión y acceder a tus cursos, compras y progreso desde el área de alumnos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
            >
              {user ? "Ir a mis cursos" : "Iniciar sesión"}
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-neutral-500"
            >
              Ver cursos
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
