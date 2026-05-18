import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre compra de cursos, acceso al contenido, eventos presenciales y soporte de la academia.",
};

const FALLBACK_FAQS: FaqItem[] = [
  {
    id: "purchase",
    question: "C\u00f3mo se compra un curso",
    answer:
      "Cada curso se compra de forma individual desde el cat\u00e1logo. Tras el pago validado, el acceso queda activado en tu cuenta.",
  },
  {
    id: "access",
    question: "C\u00f3mo accedo al contenido comprado",
    answer:
      "Inicia sesi\u00f3n con tu cuenta verificada y entra en el detalle del curso. Si el pago est\u00e1 confirmado, las lecciones completas aparecen desbloqueadas.",
  },
  {
    id: "included",
    question: "Qu\u00e9 acceso incluye la compra",
    answer:
      "La compra desbloquea las lecciones completas del curso adquirido y permite guardar tu progreso dentro de la cuenta.",
  },
  {
    id: "events",
    question: "Los eventos presenciales se pagan aqu\u00ed",
    answer: "No. La plataforma redirige a la ticketera oficial del evento cuando corresponda.",
  },
];

export default async function FaqPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    faqsResponse,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("faqs")
      .select("id, question, answer")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  let faqs = FALLBACK_FAQS;
  let loadError = false;
  if (faqsResponse.error) {
    loadError = true;
    logAppError("FAQ Page", "Could not load FAQs", faqsResponse.error);
  } else if (faqsResponse.data && faqsResponse.data.length > 0) {
    faqs = faqsResponse.data as FaqItem[];
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main id="main-content" className="relative flex-1 overflow-hidden pt-28 pb-20 px-6 md:px-12">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_80%_0%,rgba(220,38,38,0.2),transparent_35%),linear-gradient(180deg,rgba(10,10,10,0.2),transparent)]" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">FAQ</p>
            <h1 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
              Preguntas frecuentes
            </h1>
            <p className="text-lg leading-relaxed text-neutral-400">
              {
                "Respuestas r\u00e1pidas sobre compra de cursos, acceso al contenido, eventos presenciales y soporte."
              }
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <ShoppingBag className="mb-3 text-red-300" size={24} aria-hidden="true" />
              <p className="text-sm font-semibold text-white">Compra individual</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                {"Pagas solo el curso que quieres ver."}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <ShieldCheck className="mb-3 text-red-300" size={24} aria-hidden="true" />
              <p className="text-sm font-semibold text-white">Acceso protegido</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                {"Las lecciones completas se desbloquean desde tu cuenta."}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
              <HelpCircle className="mb-3 text-red-300" size={24} aria-hidden="true" />
              <p className="text-sm font-semibold text-white">Soporte oficial</p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                {"Si algo falla, usa el canal de contacto de la plataforma."}
              </p>
            </div>
          </div>

          {loadError && (
            <div role="status" className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
              {"Mostramos las preguntas frecuentes b\u00e1sicas mientras se actualiza el contenido."}
            </div>
          )}

          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 open:border-red-500/30 open:bg-neutral-900/80"
              >
                <summary className="cursor-pointer list-none text-lg font-semibold text-white marker:hidden">
                  <span className="flex items-center justify-between gap-6">
                    {faq.question}
                    <span className="text-sm text-red-300 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-neutral-400 whitespace-pre-line">{faq.answer}</p>
              </details>
            ))}
          </div>

          <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <h2 className="mb-3 text-xl font-semibold text-white">{"\u00bfNo encuentras tu caso?"}</h2>
            <p className="mb-6 text-sm leading-relaxed text-neutral-400">
              {"Escr\u00edbenos por el canal oficial indicando tu correo de registro y el curso afectado, si procede."}
            </p>
            <Link
              href="/contact"
              className="inline-flex rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Contactar con soporte
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
