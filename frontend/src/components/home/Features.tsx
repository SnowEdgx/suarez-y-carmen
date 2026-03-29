import { Video, Users, CheckCircle, Smartphone } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <Video className="w-8 h-8 text-red-500" />,
      title: "Calidad 4K",
      description: "Vídeos grabados con la máxima calidad multicámara para que no te pierdas ningún detalle de los pies o las manos."
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-red-500" />,
      title: "Paso a Paso",
      description: "Metodología probada estructurada progresivamente, desde los pasos básicos hasta figuras complejas."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-red-500" />,
      title: "Multiplataforma",
      description: "Aprende a tu ritmo desde cualquier dispositivo: móvil, tablet o proyéctalo en tu Smart TV."
    },
    {
      icon: <Users className="w-8 h-8 text-red-500" />,
      title: "Comunidad VIP",
      description: "Accede a grupos privados, correcciones en vídeo y directos exclusivos cada mes."
    }
  ];

  return (
    <section id="methodology" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">¿Por qué estudiar con nosotros?</h2>
        <p className="text-neutral-400 max-w-2xl mx-auto text-lg">Nos enfocamos en la técnica y la musicalidad para que bailes de forma natural y conectada.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {features.map((f, i) => (
          <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="mb-6 p-4 bg-neutral-950 rounded-full shadow-inner shadow-black/50">
              {f.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
