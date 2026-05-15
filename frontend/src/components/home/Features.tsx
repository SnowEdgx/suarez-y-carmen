import { Video, Users, CheckCircle, Smartphone } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <Video className="w-8 h-8 text-red-500" />,
      title: "Calidad 4K",
      description:
        "Vídeos grabados con calidad multicámara para trabajar detalles de pies, brazos y disociación con precisión.",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-red-500" />,
      title: "Paso a paso",
      description:
        "Metodología progresiva desde fundamentos hasta combinaciones avanzadas, con foco técnico y musical.",
    },
    {
      icon: <Smartphone className="w-8 h-8 text-red-500" />,
      title: "Multiplataforma",
      description:
        "Aprende a tu ritmo desde móvil, tablet o escritorio con acceso inmediato al contenido comprado.",
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      title: "Acompañamiento",
      description:
        "Estructura clara para practicar cada lección con criterio y reducir bloqueos durante el aprendizaje.",
    },
  ];

  return (
    <section id="methodology" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">
          Por qué estudiar con nosotros
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
          Nos enfocamos en técnica, musicalidad y estilo para que bailes con naturalidad y confianza.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            <div className="mb-6 p-4 bg-neutral-950 rounded-full shadow-inner shadow-black/50">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
