import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, Mail } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

const SUPPORT_EMAIL = "academy@suarezycarmenbachata.com";
const INSTAGRAM_URL = "https://www.instagram.com/suarezycarmenoficial/";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales oficiales de contacto y soporte de Suárez y Carmen.",
};

export default async function ContactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 font-sans text-neutral-100 selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main id="main-content" className="relative flex-1 overflow-hidden px-6 pb-24 pt-32 md:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_12%,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.18),transparent)]" />

        <section className="relative mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-red-500">Contacto</p>
            <h1 className="mb-6 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl">
              Escríbenos por el canal correcto.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-neutral-400">
              Para compras, acceso a cursos, problemas de reproducción o dudas sobre clases presenciales, utiliza los
              canales oficiales. Así evitamos mensajes perdidos y podemos revisar tu caso con contexto.
            </p>

            <div className="mt-12 border-y border-neutral-800 py-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <Mail className="mb-5 text-red-300" size={34} aria-hidden="true" />
                  <h2 className="mb-2 text-2xl font-semibold text-white">Soporte de alumnos</h2>
                  <p className="max-w-xl text-sm leading-relaxed text-neutral-400">
                    Incluye tu correo de registro y el curso afectado si la consulta está relacionada con una compra o
                    con el acceso al contenido.
                  </p>
                </div>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex w-fit rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </div>

          <aside className="space-y-8 lg:pt-20">
            <div className="border-l border-neutral-800 pl-6">
              <ExternalLink className="mb-4 text-red-300" size={28} aria-hidden="true" />
              <h2 className="mb-2 text-xl font-semibold text-white">Instagram oficial</h2>
              <p className="mb-4 text-sm leading-relaxed text-neutral-400">
                Para novedades, actividad diaria y mensajes relacionados con eventos o clases.
              </p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-red-300 transition-colors hover:text-red-200"
              >
                @suarezycarmenoficial
              </a>
            </div>

            <div className="border-l border-neutral-800 pl-6">
              <Clock className="mb-4 text-red-300" size={28} aria-hidden="true" />
              <h2 className="mb-2 text-xl font-semibold text-white">Respuesta</h2>
              <p className="text-sm leading-relaxed text-neutral-400">
                Las consultas de acceso y compras tienen prioridad. El tiempo habitual de respuesta es de 24 a 72 horas
                laborables.
              </p>
            </div>

            <div className="border-l border-red-500/40 bg-red-500/5 py-5 pl-6 pr-5">
              <h2 className="mb-2 text-xl font-semibold text-white">Antes de escribir</h2>
              <p className="mb-5 text-sm leading-relaxed text-red-100/80">
                Si tu duda es común, puede estar resuelta en preguntas frecuentes.
              </p>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-200 transition-colors hover:text-white"
              >
                Ver preguntas frecuentes
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
