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
          Informacion sobre el tratamiento de datos personales en la plataforma. Ultima actualizacion: 17/04/2026.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">1. Responsable y contacto</h2>
            <p>
              La gestion del tratamiento de datos se realiza para operar la academia online de Suarez y Carmen. Para consultas sobre
              privacidad puedes escribir a academy@suarezycarmen.com.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">2. Datos que se tratan</h2>
            <p>
              Se tratan datos de identificacion y contacto (correo, nombre), datos de autenticacion, informacion basica de perfil,
              historial de compra y registros tecnicos necesarios para seguridad y trazabilidad.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">3. Finalidades del tratamiento</h2>
            <p>
              Los datos se usan para crear y gestionar cuentas, controlar acceso a cursos comprados, procesar cobros, prevenir fraude,
              resolver incidencias tecnicas y cumplir obligaciones legales.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">4. Base juridica y conservacion</h2>
            <p>
              El tratamiento se basa en la ejecucion de la relacion contractual y en obligaciones legales aplicables. Los datos se
              conservaran mientras exista relacion activa y durante los plazos legales exigibles.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">5. Encargados y terceros</h2>
            <p>
              Para la prestacion tecnica se utilizan servicios de terceros para autenticacion, base de datos, pasarela de pago y envio de
              correos transaccionales, bajo sus condiciones y medidas de seguridad.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">6. Derechos de las personas usuarias</h2>
            <p>
              Puedes solicitar acceso, rectificacion, supresion, limitacion u oposicion al tratamiento de tus datos mediante el canal de
              contacto indicado.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">7. Seguridad</h2>
            <p>
              La plataforma aplica controles tecnicos y organizativos razonables, incluyendo autenticacion, control de acceso y politicas
              de base de datos para minimizar accesos no autorizados.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">8. Cambios en esta politica</h2>
            <p>
              Esta politica puede actualizarse para reflejar cambios funcionales, regulatorios o de seguridad. La version publicada en la
              web sera siempre la referencia vigente.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
