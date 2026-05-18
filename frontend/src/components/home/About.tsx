import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Music2, ShieldCheck, Users } from "lucide-react";
import { STORAGE_ASSETS } from "@/lib/constants";

type AboutImageProps = {
  src: string;
  alt: string;
  heightClassName: string;
};

function AboutImage({ src, alt, heightClassName }: AboutImageProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/30 ${heightClassName}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 50vw, 25vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  );
}

const pillars = [
  {
    icon: GraduationCap,
    title: "Formaci\u00f3n progresiva",
    description:
      "Cursos estructurados por niveles para trabajar bases, t\u00e9cnica corporal, musicalidad y combinaciones con criterio.",
  },
  {
    icon: Music2,
    title: "Estilo y conexi\u00f3n",
    description:
      "El objetivo no es memorizar figuras aisladas, sino entender c\u00f3mo moverse, escuchar la m\u00fasica y bailar con naturalidad.",
  },
  {
    icon: Users,
    title: "Puente entre online y sala",
    description:
      "La academia online complementa las clases presenciales, talleres y eventos, manteniendo una experiencia coherente.",
  },
  {
    icon: ShieldCheck,
    title: "Acceso ordenado",
    description:
      "Cada alumno accede al contenido adquirido desde su cuenta, con una plataforma pensada para crecer sin depender solo de redes sociales.",
  },
];

export default function About() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_10%,rgba(220,38,38,0.22),transparent_35%),linear-gradient(180deg,rgba(10,10,10,0.35),#0a0a0a)]" />

      <section className="relative px-6 pt-36 pb-20 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-red-400">
              Sobre nosotros
            </p>
            <h1 className="mb-6 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl">
              {"Su\u00e1rez y Carmen"}
            </h1>
            <p className="mb-6 text-lg leading-relaxed text-neutral-300 md:text-xl">
              {
                "Somos un d\u00fao de bailarines e instructores de bachata que combina formaci\u00f3n presencial, eventos y cursos online para acercar una metodolog\u00eda clara a alumnos de distintos niveles."
              }
            </p>
            <p className="mb-10 max-w-2xl text-base leading-relaxed text-neutral-400 md:text-lg">
              {
                "La plataforma nace para ordenar esa actividad en un espacio propio: mostrar el valor antes de la compra, facilitar el acceso a cursos individuales y mantener una relaci\u00f3n m\u00e1s directa con la comunidad."
              }
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Ver cursos
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/classes"
                className="inline-flex items-center justify-center rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Clases presenciales
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <AboutImage
                src={STORAGE_ASSETS.IMG_2681}
                alt="Su\u00e1rez y Carmen durante una sesi\u00f3n de baile"
                heightClassName="h-72 md:h-96"
              />
              <AboutImage
                src={STORAGE_ASSETS.IMG_2872}
                alt="Detalle de una clase de bachata de Su\u00e1rez y Carmen"
                heightClassName="h-52 md:h-64"
              />
            </div>
            <div className="flex flex-col gap-4 pt-10">
              <AboutImage
                src={STORAGE_ASSETS.IMG_4784}
                alt="Su\u00e1rez y Carmen bailando bachata"
                heightClassName="h-52 md:h-64"
              />
              <AboutImage
                src={STORAGE_ASSETS.IMG_4587}
                alt="Su\u00e1rez y Carmen en una producci\u00f3n visual"
                heightClassName="h-72 md:h-96"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-16 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <p className="text-4xl font-bold text-white">+5</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-neutral-500">
              {"A\u00f1os de experiencia"}
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <p className="text-4xl font-bold text-white">+100</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-neutral-500">Alumnos formados</p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <p className="text-4xl font-bold text-white">Online + sala</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-neutral-500">Modelo h\u00edbrido</p>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Metodolog\u00eda</p>
            <h2 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
              {"Una forma de aprender bachata con estructura"}
            </h2>
            <p className="text-lg leading-relaxed text-neutral-400">
              {
                "El contenido se plantea como una progresi\u00f3n: primero se consolidan fundamentos, despu\u00e9s se trabaja la calidad del movimiento y finalmente se integran figuras, musicalidad y estilo."
              }
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <article key={pillar.title} className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-red-300">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-400">{pillar.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 md:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Proyecto</p>
            <h2 className="mb-5 font-serif text-3xl font-bold text-white md:text-4xl">
              {"Una plataforma propia para una marca art\u00edstica"}
            </h2>
            <p className="mb-5 leading-relaxed text-neutral-400">
              {
                "La web no funciona como un cat\u00e1logo cerrado sin contexto. La parte p\u00fablica presenta la marca, cursos, clases y agenda; la parte privada centraliza el acceso del alumno al contenido comprado."
              }
            </p>
            <p className="leading-relaxed text-neutral-400">
              {
                "Esta separaci\u00f3n permite que nuevos visitantes entiendan la propuesta antes de pagar, mientras que los alumnos mantienen un espacio ordenado para seguir su formaci\u00f3n."
              }
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 md:p-10">
            <CalendarDays className="mb-5 text-red-300" size={34} aria-hidden="true" />
            <h2 className="mb-4 text-2xl font-bold text-white">Actividad presencial</h2>
            <p className="mb-8 text-sm leading-relaxed text-red-100/80">
              {
                "La agenda y las clases presenciales completan el ecosistema: cursos para avanzar desde casa y espacios presenciales para seguir entrenando en comunidad."
              }
            </p>
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
            >
              Ver agenda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
