import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales oficiales de contacto y soporte de la academia online de Suárez y Carmen.",
};

export default async function ContactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-3xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Contacto</h1>
        <p className="text-neutral-400 mb-10">
          Si necesitas soporte sobre acceso, compra o contenido, usa estos canales oficiales.
        </p>

        <div className="space-y-6">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Correo de soporte</h2>
            <a
              href="mailto:academy@suarezycarmenbachata.com"
              className="text-red-400 hover:text-red-300 transition-colors text-sm"
            >
              academy@suarezycarmenbachata.com
            </a>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Instagram oficial</h2>
            <a
              href="https://www.instagram.com/suarezycarmenoficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 transition-colors text-sm"
            >
              @suarezycarmenoficial
            </a>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Tiempo de respuesta</h2>
            <p className="text-neutral-400 text-sm">
              Intentamos responder en un plazo de 24 a 72 horas laborables.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
