import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function TermsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Terminos y condiciones</h1>
        <p className="text-neutral-400 mb-10">
          Documento informativo provisional para el entorno de proyecto. Debe sustituirse por version legal validada antes de produccion.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Objeto del servicio</h2>
            <p>
              La plataforma ofrece acceso a formacion online de baile mediante compra individual de cursos.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Cuenta de usuario</h2>
            <p>
              El acceso requiere registro y verificacion de correo. El usuario es responsable de custodiar sus credenciales.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Pagos</h2>
            <p>
              Los pagos se gestionan a traves de Stripe. La plataforma no almacena informacion completa de tarjeta.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">Propiedad intelectual</h2>
            <p>
              El contenido audiovisual y didactico pertenece a sus autores y no puede redistribuirse sin autorizacion.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
