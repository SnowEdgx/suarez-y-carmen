import { Check } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold font-serif text-white mb-6">
          Modelo comercial
        </h2>
        <p className="text-neutral-400 text-lg">
          Pago singular por curso. Compras solo lo que necesitas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <article className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Cursos online</h3>
          <p className="text-neutral-400 mb-6">
            Catalogo por niveles con acceso inmediato tras el pago.
          </p>
          <div className="mb-8 font-serif">
            <span className="text-3xl font-medium text-neutral-500">desde </span>
            <span className="text-5xl font-bold text-white">EUR 29</span>
          </div>
          <Link
            href="/courses"
            className="w-full text-center py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors mb-8 block"
          >
            Ver catalogo
          </Link>
          <div className="space-y-4 mt-auto">
            {[
              "Acceso al curso comprado",
              "Lecciones desbloqueadas por compra",
              "Actualizaciones del curso incluidas",
              "Pago unico seguro con Stripe",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-neutral-500" />
                <span className="text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Presenciales y eventos</h3>
          <p className="text-neutral-400 mb-6">
            Talleres, clases y congresos se publican en agenda con enlaces externos.
          </p>
          <div className="mb-8">
            <span className="text-neutral-300 text-lg">Informacion actualizada en la web y redes.</span>
          </div>
          <Link
            href="/#about"
            className="w-full text-center py-4 border border-neutral-700 hover:bg-neutral-800 text-white rounded-full font-semibold transition-colors mb-8 block"
          >
            Conocer mas
          </Link>
          <div className="space-y-4 mt-auto">
            {[
              "Agenda publica con redireccion a ticketera oficial",
              "No se procesan pagos de eventos en la plataforma",
              "Integracion con estrategia de marca personal",
              "Canal claro entre contenido online y actividad presencial",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-neutral-500" />
                <span className="text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
