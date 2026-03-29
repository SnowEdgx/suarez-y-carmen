import { Check } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold font-serif text-white mb-6">Invierte en tu Baile</h2>
        <p className="text-neutral-400 text-lg">Pagos únicos, acceso para toda la vida. Sin suscripciones ocultas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Tier 1 */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Por Curso</h3>
          <p className="text-neutral-400 mb-6">Elige exactamente lo que quieres aprender a tu ritmo.</p>
          <div className="mb-8 font-serif">
            <span className="text-3xl font-medium text-neutral-500">desde </span>
            <span className="text-5xl font-bold text-white">€29</span>
          </div>
          <Link href="/courses" className="w-full text-center py-4 text-white border border-neutral-700 hover:bg-neutral-800 rounded-full font-semibold transition-colors mb-8 block">
            Ver Catálogo
          </Link>
          <div className="space-y-4 mt-auto">
            {["Acceso de por vida al curso elegido", "Soporte en los comentarios", "Actualizaciones incluidas", "Pago único seguro"].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-neutral-500" />
                <span className="text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier 2 */}
        <div className="bg-gradient-to-b from-red-950/40 to-neutral-900/40 border-2 border-red-600/50 rounded-3xl p-8 flex flex-col relative shadow-2xl shadow-red-900/10 transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
            Más Rentable
          </div>
          <h3 className="text-2xl font-bold text-red-50 mb-2">Pack Completo</h3>
          <p className="text-red-200/60 mb-6">La academia entera desbloqueada para siempre.</p>
          <div className="mb-8 font-serif flex items-end">
            <div>
              <span className="text-5xl font-bold text-white">€149</span>
              <span className="text-red-200/60 text-lg"> pago único</span>
            </div>
          </div>
          <button className="w-full py-4 bg-white text-red-600 hover:bg-neutral-200 rounded-full font-bold transition-colors mb-8 shadow-xl">
            Comprar Pack Completo
          </button>
          <div className="space-y-4 mt-auto">
            {["Todos los cursos actuales y futuros", "Correcciones en vídeo personalizadas", "Grupo exclusivo de WhatsApp", "Descuentos en talleres presenciales"].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-red-500" />
                <span className="text-red-50 text-opacity-90">{feature}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
