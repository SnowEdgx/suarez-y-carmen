import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FALLBACK_FAQS: FaqItem[] = [
  {
    id: "purchase",
    question: "Cómo se compra un curso",
    answer:
      "Cada curso se compra de forma individual desde el catálogo. Tras el pago validado, el acceso queda activado en tu cuenta.",
  },
  {
    id: "access",
    question: "Cómo accedo al contenido comprado",
    answer:
      "Inicia sesión con tu cuenta verificada y entra en el detalle del curso. Si el pago está confirmado, las lecciones completas aparecen desbloqueadas.",
  },
  {
    id: "included",
    question: "Qué acceso incluye la compra",
    answer:
      "La compra desbloquea las lecciones completas del curso adquirido y permite guardar tu progreso dentro de la cuenta.",
  },
  {
    id: "events",
    question: "Los eventos presenciales se pagan aquí",
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
      <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Preguntas frecuentes</h1>
        <p className="text-neutral-400 mb-10">
          Resumen operativo del modelo actual de la academia.
        </p>

        {loadError && (
          <div role="status" className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            Mostramos las preguntas frecuentes básicas mientras se actualiza el contenido.
          </div>
        )}

        <div className="space-y-6">
          {faqs.map((faq) => (
            <section key={faq.id} className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
              <h2 className="text-white font-semibold mb-2">{faq.question}</h2>
              <p className="text-neutral-400 text-sm whitespace-pre-line">{faq.answer}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
