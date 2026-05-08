import Image from "next/image";
import { STORAGE_ASSETS } from "@/lib/constants";

type AboutImageProps = {
  src: string;
  alt: string;
  heightClassName: string;
};

function AboutImage({ src, alt, heightClassName }: AboutImageProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg ${heightClassName}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 50vw, 25vw"
        className="object-cover"
      />
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold font-serif text-white mb-6">Suarez y Carmen</h2>
          <p className="text-neutral-400 text-lg mb-6 leading-relaxed">
            Somos una pareja de bailarines e instructores apasionados por la bachata. Con anos de experiencia en las pistas de baile y en
            las aulas, hemos desarrollado una metodologia directa y efectiva para que aprendas a bailar con soltura, tecnica y conexion
            musical.
          </p>
          <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
            Nuestro objetivo es acercar el baile a tu salon. Sin importar si nunca has dado un paso basico o si buscas perfeccionar tu
            tecnica para redes sociales; aqui encontraras la formacion paso a paso que necesitas.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">+5</span>
              <span className="text-sm text-neutral-500 uppercase tracking-wider">Anos Experiencia</span>
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
            <AboutImage
              src={STORAGE_ASSETS.IMG_2681}
              alt="Suarez y Carmen 1"
              heightClassName="h-64"
            />
            <AboutImage
              src={STORAGE_ASSETS.IMG_2872}
              alt="Suarez y Carmen 2"
              heightClassName="h-48"
            />
          </div>
          <div className="flex flex-col gap-4 pt-12">
            <AboutImage
              src={STORAGE_ASSETS.IMG_4784}
              alt="Suarez y Carmen 3"
              heightClassName="h-48"
            />
            <AboutImage
              src={STORAGE_ASSETS.IMG_4587}
              alt="Suarez y Carmen 4"
              heightClassName="h-64"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
