import { STORAGE_ASSETS } from "@/lib/constants";

export default function About() {
  return (
    <section id="about" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold font-serif text-white mb-6">Suárez y Carmen</h2>
          <p className="text-neutral-400 text-lg mb-6 leading-relaxed">
            Somos una pareja de bailarines e instructores apasionados por la bachata. Con años de experiencia en las pistas de baile y en las aulas, hemos desarrollado una metodología directa y efectiva para que aprendas a bailar con soltura, técnica y conexión musical.
          </p>
          <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
            Nuestro objetivo es acercar el baile a tu salón. Sin importar si nunca has dado un paso básico o si buscas perfeccionar tu técnica para redes sociales; aquí encontrarás la formación paso a paso que necesitas.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">+5</span>
              <span className="text-sm text-neutral-500 uppercase tracking-wider">Años Experiencia</span>
            </div>
            <div className="w-px h-12 bg-neutral-800 mx-4"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">+100</span>
              <span className="text-sm text-neutral-500 uppercase tracking-wider">Alumnos</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <img src={STORAGE_ASSETS.IMG_2681} alt="Suárez y Carmen 1" className="rounded-2xl object-cover h-64 w-full shadow-lg" />
            <img src={STORAGE_ASSETS.IMG_2872} alt="Suárez y Carmen 2" className="rounded-2xl object-cover h-48 w-full shadow-lg" />
          </div>
          <div className="flex flex-col gap-4 pt-12">
            <img src={STORAGE_ASSETS.IMG_4784} alt="Suárez y Carmen 3" className="rounded-2xl object-cover h-48 w-full shadow-lg" />
            <img src={STORAGE_ASSETS.IMG_4587} alt="Suárez y Carmen 4" className="rounded-2xl object-cover h-64 w-full shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
