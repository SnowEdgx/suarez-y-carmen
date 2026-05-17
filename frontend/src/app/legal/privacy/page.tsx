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
      <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Política de privacidad</h1>
        <p className="text-neutral-400 mb-10">
          Información sobre el tratamiento de datos personales en la plataforma. Última actualización: 17/04/2026.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">1. Responsable y contacto</h2>
            <p>
              La gestión del tratamiento de datos se realiza para operar la academia online de Suárez y Carmen. Para consultas sobre
              privacidad puedes escribir a academy@suarezycarmenbachata.com.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">2. Datos que se tratan</h2>
            <p>
              Se tratan datos de identificación y contacto (correo, nombre), datos de autenticación, información básica de perfil,
              historial de compra y registros técnicos necesarios para seguridad y trazabilidad.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">3. Finalidades del tratamiento</h2>
            <p>
              Los datos se usan para crear y gestionar cuentas, controlar acceso a cursos comprados, procesar cobros, prevenir fraude,
              resolver incidencias técnicas y cumplir obligaciones legales.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">4. Base jurídica y conservación</h2>
            <p>
              El tratamiento se basa en la ejecución de la relación contractual y en obligaciones legales aplicables. Los datos se
              conservarán mientras exista relación activa y durante los plazos legales exigibles.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">5. Encargados y terceros</h2>
            <p>
              Para la prestación técnica se utilizan servicios de terceros para autenticación, base de datos, pasarela de pago y envío de
              correos transaccionales, bajo sus condiciones y medidas de seguridad.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">6. Derechos de las personas usuarias</h2>
            <p>
              Puedes solicitar acceso, rectificación, supresión, limitación u oposición al tratamiento de tus datos mediante el canal de
              contacto indicado.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">7. Seguridad</h2>
            <p>
              La plataforma aplica controles técnicos y organizativos razonables, incluyendo autenticación, control de acceso y políticas
              de base de datos para minimizar accesos no autorizados.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">8. Cambios en esta política</h2>
            <p>
              Esta política puede actualizarse para reflejar cambios funcionales, regulatorios o de seguridad. La versión publicada en la
              web será siempre la referencia vigente.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
