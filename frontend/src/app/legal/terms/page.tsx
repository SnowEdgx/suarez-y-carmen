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
      <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl font-bold font-serif text-white mb-4">Términos y condiciones</h1>
        <p className="text-neutral-400 mb-10">
          Condiciones de uso y contratación aplicables a la academia online de Suárez y Carmen. Última actualización: 17/04/2026.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">1. Objeto y aceptación</h2>
            <p>
              Estas condiciones regulan el acceso y uso de la plataforma, así como la compra individual de cursos digitales. El uso del
              servicio implica la aceptación de estas condiciones en su versión vigente.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">2. Registro y cuenta de usuario</h2>
            <p>
              Para comprar cursos es necesario registrarse, verificar el correo electrónico y mantener la confidencialidad de las
              credenciales. El usuario es responsable de la actividad realizada desde su cuenta.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">3. Compra y acceso a cursos</h2>
            <p>
              El servicio actual funciona con pago singular por curso. Tras la confirmación del cobro, el acceso se activa en la
              cuenta del usuario para el curso adquirido.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">4. Pagos, impuestos y devoluciones</h2>
            <p>
              Los pagos se procesan mediante Stripe. La plataforma no almacena datos completos de tarjeta. Las solicitudes de devolución
              se evalúan caso por caso según la normativa aplicable y el estado de consumo del contenido digital.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">5. Uso permitido del contenido</h2>
            <p>
              El acceso al material es personal e intransferible. Queda prohibida la redistribución, grabación, descarga no autorizada,
              compartición de credenciales o cualquier uso distinto al aprendizaje personal.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">6. Propiedad intelectual</h2>
            <p>
              Los vídeos, textos, imágenes, marcas y recursos formativos son titularidad de sus autores o de terceros con licencia. No se
              cede ningún derecho de explotación sobre dichos contenidos.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">7. Disponibilidad del servicio</h2>
            <p>
              Se aplican medidas razonables para mantener la continuidad del servicio. No obstante, pueden producirse interrupciones por
              mantenimiento, incidencias técnicas o causas de fuerza mayor.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">8. Soporte y contacto</h2>
            <p>
              Para incidencias de acceso, pagos o protección de datos, el canal de contacto operativo es academy@suarezycarmenbachata.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
