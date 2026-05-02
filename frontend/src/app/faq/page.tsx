import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function FaqPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Preguntas frecuentes</h1>
        <p className="text-neutral-400 mb-10">
          Resumen operativo del modelo actual de la academia.
        </p>

        <div className="space-y-6">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Como se compra un curso</h2>
            <p className="text-neutral-400 text-sm">
              Cada curso se compra de forma individual desde el catalogo. Tras el pago validado, el acceso queda activado en tu cuenta.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Como accedo al contenido comprado</h2>
            <p className="text-neutral-400 text-sm">
              Inicia sesion con tu cuenta verificada y entra en el detalle del curso. Si el pago esta confirmado, las lecciones completas aparecen desbloqueadas.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Que acceso incluye la compra</h2>
            <p className="text-neutral-400 text-sm">
              La compra desbloquea las lecciones completas del curso adquirido y permite guardar tu progreso dentro de la cuenta.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Los eventos presenciales se pagan aqui</h2>
            <p className="text-neutral-400 text-sm">
              No. La plataforma redirige a la ticketera oficial del evento cuando corresponda.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
