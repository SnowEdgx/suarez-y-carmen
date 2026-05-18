import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, Mail, MessageCircle } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

const SUPPORT_EMAIL = "academy@suarezycarmenbachata.com";
const INSTAGRAM_URL = "https://www.instagram.com/suarezycarmenoficial/";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales oficiales de contacto y soporte de la academia online de Su\u00e1rez y Carmen.",
};

export default async function ContactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main id="main-content" className="relative flex-1 overflow-hidden pt-28 pb-20 px-6 md:px-12">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_20%_10%,rgba(220,38,38,0.22),transparent_35%),linear-gradient(180deg,rgba(10,10,10,0.2),transparent)]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Contacto</p>
            <h1 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
              {"Canales oficiales de soporte"}
            </h1>
            <p className="text-lg leading-relaxed text-neutral-400">
              {
                "Si necesitas ayuda con una compra, el acceso a un curso, una clase presencial o una colaboraci\u00f3n, utiliza siempre estos canales para evitar mensajes perdidos en redes."
              }
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
              <Mail className="mb-5 text-red-300" size={30} aria-hidden="true" />
              <h2 className="mb-3 text-xl font-semibold text-white">Soporte de academia</h2>
              <p className="mb-6 text-sm leading-relaxed text-neutral-400">
                {"Para incidencias de acceso, pagos, v\u00eddeos o cuenta de alumno."}
              </p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-semibold text-red-300 hover:text-red-200">
                {SUPPORT_EMAIL}
              </a>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
              <ExternalLink className="mb-5 text-red-300" size={30} aria-hidden="true" />
              <h2 className="mb-3 text-xl font-semibold text-white">Instagram oficial</h2>
              <p className="mb-6 text-sm leading-relaxed text-neutral-400">
                {"Para novedades, actividad diaria y mensajes relacionados con clases o eventos."}
              </p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-red-300 hover:text-red-200"
              >
                @suarezycarmenoficial
              </a>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
              <Clock className="mb-5 text-red-300" size={30} aria-hidden="true" />
              <h2 className="mb-3 text-xl font-semibold text-white">Tiempo de respuesta</h2>
              <p className="mb-6 text-sm leading-relaxed text-neutral-400">
                {
                  "El objetivo es responder en un plazo de 24 a 72 horas laborables, seg\u00fan volumen de mensajes y agenda."
                }
              </p>
              <p className="text-sm font-semibold text-neutral-200">{"Prioridad: accesos y compras"}</p>
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-7 md:p-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <MessageCircle className="mb-4 text-red-200" size={32} aria-hidden="true" />
                <h2 className="mb-3 text-2xl font-bold text-white">Antes de escribir</h2>
                <p className="text-sm leading-relaxed text-red-100/80">
                  {
                    "Si la duda es sobre compra, acceso o funcionamiento de la plataforma, revisa primero las preguntas frecuentes. Ah\u00ed se recogen los casos m\u00e1s habituales."
                  }
                </p>
              </div>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
              >
                Ver preguntas frecuentes
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
