import Link from "next/link";
import { Play } from "lucide-react";
import { STORAGE_ASSETS } from "@/lib/constants";
import HomeSectionLink from "./HomeSectionLink";

export default function Hero() {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
        src={STORAGE_ASSETS.VIDEO_HERO}
      />

      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-950 to-transparent"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 mt-16 max-w-5xl">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-2xl font-serif">
          Master the head movements.
        </h1>
        <h2 className="mt-6 md:mt-8 text-lg md:text-2xl text-neutral-300 font-light drop-shadow-md max-w-3xl">
          Domina la sensualidad, el estilo y la conexión con <strong className="text-white font-medium">Suárez y Carmen</strong>.
          Aprende desde casa paso a paso con cursos individuales y acceso inmediato.
        </h2>

        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <Link
            href="/courses"
            className="flex items-center gap-2 px-10 py-4 sm:px-12 sm:py-5 bg-red-600 hover:bg-red-700 text-white text-lg md:text-xl font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Ver catálogo
          </Link>
          <HomeSectionLink
            sectionId="methodology"
            className="flex items-center justify-center gap-2 px-10 py-4 sm:px-12 sm:py-5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white text-lg md:text-xl font-semibold rounded-full transition-all duration-300"
          >
            <Play size={20} fill="currentColor" /> Ver metodología
          </HomeSectionLink>
        </div>
      </div>
    </section>
  );
}
