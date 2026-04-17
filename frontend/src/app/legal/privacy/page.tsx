import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Politica de privacidad</h1>
        <p className="text-neutral-400 mb-10">
          Documento informativo provisional para el entorno de proyecto. Debe sustituirse por version legal validada antes de produccion.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Datos tratados</h2>
            <p>
              Se tratan datos de registro, autenticacion y compras necesarios para prestar el servicio.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Finalidad</h2>
            <p>
              Gestion de cuenta de usuario, control de acceso a cursos y soporte tecnico.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Pasarela de pago</h2>
            <p>
              Los pagos se procesan con Stripe como tercero encargado del cobro.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Derechos del usuario</h2>
            <p>
              Puedes solicitar acceso, rectificacion o supresion de tus datos mediante el canal de contacto oficial.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
