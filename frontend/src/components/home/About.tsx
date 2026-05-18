import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Music2, ShieldCheck, Users } from "lucide-react";
import { STORAGE_ASSETS } from "@/lib/constants";

type AboutImageProps = {
  src: string;
  alt: string;
  heightClassName: string;
  priority?: boolean;
};

function AboutImage({ src, alt, heightClassName, priority = false }: AboutImageProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/30 ${heightClassName}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 45vw, 25vw"
        className="object-cover"
        priority={priority}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  );
}

const pillars = [
  {
    icon: GraduationCap,
    title: "Formación progresiva",
    description:
      "Cursos estructurados por niveles para trabajar bases, técnica corporal, musicalidad y combinaciones con criterio.",
  },
  {
    icon: Music2,
    title: "Estilo y conexión",
    description:
      "El objetivo no es memorizar figuras aisladas, sino entender cómo moverse, escuchar la música y bailar con naturalidad.",
  },
  {
    icon: Users,
    title: "Puente entre online y sala",
    description:
      "La academia online complementa las clases presenciales, talleres y eventos, manteniendo una experiencia coherente.",
  },
  {
    icon: ShieldCheck,
    title: "Aprendizaje ordenado",
    description:
      "Cada alumno accede a sus cursos desde una cuenta propia, con lecciones claras y progreso visible.",
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
              Suárez y Carmen
            </h1>
            <p className="mb-6 text-lg leading-relaxed text-neutral-300 md:text-xl">
              {
                "Somos un dúo de bailarines e instructores de bachata que combina formación presencial, eventos y cursos online para acercar una metodología clara a alumnos de distintos niveles."
              }
            </p>
            <p className="mb-10 max-w-2xl text-base leading-relaxed text-neutral-400 md:text-lg">
              {
                "Nuestro enfoque une técnica, musicalidad y estilo para que puedas entrenar desde casa y seguir creciendo también en sala."
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
                alt="Suárez y Carmen durante una sesión de baile"
                heightClassName="h-72 md:h-96"
                priority
              />
              <AboutImage
                src={STORAGE_ASSETS.IMG_2872}
                alt="Detalle de una clase de bachata de Suárez y Carmen"
                heightClassName="h-52 md:h-64"
              />
            </div>
            <div className="flex flex-col gap-4 pt-10">
              <AboutImage
                src={STORAGE_ASSETS.IMG_4784}
                alt="Suárez y Carmen bailando bachata"
                heightClassName="h-52 md:h-64"
                priority
              />
              <AboutImage
                src={STORAGE_ASSETS.IMG_4587}
                alt="Suárez y Carmen en una producción visual"
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
              Años de experiencia
            </p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <p className="text-4xl font-bold text-white">+100</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-neutral-500">Alumnos formados</p>
          </div>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-7">
            <p className="text-4xl font-bold text-white">Online + sala</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-neutral-500">Entrenamiento híbrido</p>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Metodología</p>
            <h2 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
              {"Una forma de aprender bachata con estructura"}
            </h2>
            <p className="text-lg leading-relaxed text-neutral-400">
              {
                "El contenido se plantea como una progresión: primero se consolidan fundamentos, después se trabaja la calidad del movimiento y finalmente se integran figuras, musicalidad y estilo."
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Aprende con nosotros</p>
            <h2 className="mb-5 font-serif text-3xl font-bold text-white md:text-4xl">
              Cursos para entrenar a tu ritmo
            </h2>
            <p className="mb-5 leading-relaxed text-neutral-400">
              {
                "Puedes explorar el catálogo, ver previews y comprar únicamente los cursos que quieras trabajar. Cada curso está pensado para que sepas qué practicar y cómo avanzar."
              }
            </p>
            <p className="leading-relaxed text-neutral-400">
              {
                "Si ya eres alumno, tu área privada reúne tus compras, lecciones disponibles y progreso para retomar la formación sin perder el hilo."
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
