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
          Condiciones de uso y contratacion aplicables a la academia online de Suarez y Carmen. Ultima actualizacion: 17/04/2026.
        </p>

        <div className="space-y-6 text-sm text-neutral-300">
          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">1. Objeto y aceptacion</h2>
            <p>
              Estas condiciones regulan el acceso y uso de la plataforma, asi como la compra individual de cursos digitales. El uso del
              servicio implica la aceptacion de estas condiciones en su version vigente.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">2. Registro y cuenta de usuario</h2>
            <p>
              Para comprar cursos es necesario registrarse, verificar el correo electronico y mantener la confidencialidad de las
              credenciales. El usuario es responsable de la actividad realizada desde su cuenta.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">3. Compra y acceso a cursos</h2>
            <p>
              El servicio actual funciona con pago singular por curso. Tras la confirmacion del cobro, el acceso se activa en la
              cuenta del usuario para el curso adquirido.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">4. Pagos, impuestos y devoluciones</h2>
            <p>
              Los pagos se procesan mediante Stripe. La plataforma no almacena datos completos de tarjeta. Las solicitudes de devolucion
              se evaluan caso por caso segun la normativa aplicable y el estado de consumo del contenido digital.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">5. Uso permitido del contenido</h2>
            <p>
              El acceso al material es personal e intransferible. Queda prohibida la redistribucion, grabacion, descarga no autorizada,
              comparticion de credenciales o cualquier uso distinto al aprendizaje personal.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">6. Propiedad intelectual</h2>
            <p>
              Los videos, textos, imagenes, marcas y recursos formativos son titularidad de sus autores o de terceros con licencia. No se
              cede ningun derecho de explotacion sobre dichos contenidos.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">7. Disponibilidad del servicio</h2>
            <p>
              Se aplican medidas razonables para mantener la continuidad del servicio. No obstante, pueden producirse interrupciones por
              mantenimiento, incidencias tecnicas o causas de fuerza mayor.
            </p>
          </section>

          <section className="border border-neutral-800 rounded-2xl p-6 bg-neutral-900/40">
            <h2 className="text-white font-semibold mb-2">8. Soporte y contacto</h2>
            <p>
              Para incidencias de acceso, pagos o proteccion de datos, el canal de contacto operativo es academy@suarezycarmen.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
