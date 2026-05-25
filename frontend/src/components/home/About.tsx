import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { STORAGE_ASSETS } from "@/lib/constants";

type AboutImageProps = {
  src: string;
  alt: string;
  className: string;
  imageClassName?: string;
  priority?: boolean;
};

const trainingPrinciples = [
  {
    title: "Base técnica clara",
    description:
      "Cuidamos postura, peso, conexión y lectura corporal para que entiendas el movimiento antes de añadir complejidad.",
  },
  {
    title: "Musicalidad aplicada",
    description:
      "Entrenamos recursos para interpretar la música, modular la energía y adaptar el baile al contexto social o escénico.",
  },
  {
    title: "Práctica con sentido",
    description:
      "Proponemos ejercicios que puedes repetir, medir y llevar poco a poco a tu baile real.",
  },
];

function AboutImage({
  src,
  alt,
  className,
  imageClassName = "object-cover",
  priority = false,
}: AboutImageProps) {
  return (
    <div className={`relative overflow-hidden bg-neutral-900 shadow-2xl shadow-black/35 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 36vw"
        quality={76}
        className={imageClassName}
        priority={priority}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
    </div>
  );
}

export default function About() {
  return (
    <div className="relative overflow-hidden bg-neutral-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_18%_12%,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.25),#0a0a0a)]" />

      <section className="relative px-6 pb-16 pt-36 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.34em] text-red-400">
              Sobre nosotros
            </p>
            <h1 className="mb-7 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl">
              Bachata con intención, técnica y conexión
            </h1>
            <div className="space-y-5 text-base leading-relaxed text-neutral-300 md:text-lg">
              <p>
                Somos Suárez y Carmen. Enseñamos bachata desde una idea sencilla: cuando entiendes qué estás haciendo,
                bailas con más seguridad, más intención y más libertad.
              </p>
              <p className="text-neutral-400">
                En nuestras clases y cursos trabajamos la técnica sin perder de vista el disfrute. Queremos que puedas
                entrenar con estructura, resolver dudas reales y llevar lo aprendido a la pista con naturalidad.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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

          <div className="grid grid-cols-12 gap-4">
            <AboutImage
              src={STORAGE_ASSETS.IMG_2681}
              alt="Suárez y Carmen bailando bachata"
              className="col-span-12 h-[460px] rounded-[2rem] lg:col-span-7"
              priority
            />
            <div className="col-span-12 grid gap-4 lg:col-span-5">
              <AboutImage
                src={STORAGE_ASSETS.IMG_4784}
                alt="Suárez y Carmen en una sesión de bachata"
                className="h-56 rounded-[2rem]"
                imageClassName="object-cover object-[center_18%]"
              />
              <AboutImage
                src={STORAGE_ASSETS.IMG_4587}
                alt="Detalle visual de Suárez y Carmen"
                className="h-56 rounded-[2rem]"
                imageClassName="object-cover object-[center_18%]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">
              Forma de trabajo
            </p>
            <h2 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
              Aprender con estructura, no solo repetir pasos
            </h2>
            <p className="leading-relaxed text-neutral-400">
              Ordenamos el contenido para que avances con criterio: primero asentamos la base, después mejoramos la
              calidad del movimiento y finalmente integramos figuras, estilo y musicalidad.
            </p>
          </div>

          <div className="divide-y divide-neutral-800 border-y border-neutral-800">
            {trainingPrinciples.map((principle, index) => (
              <article key={principle.title} className="grid grid-cols-1 gap-4 py-7 md:grid-cols-[96px_1fr]">
                <span className="font-serif text-4xl text-red-500/80">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="mb-2 text-2xl font-semibold text-white">{principle.title}</h3>
                  <p className="leading-relaxed text-neutral-400">{principle.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-[2rem] border border-red-500/15 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(23,23,23,0.92))] lg:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-200">
              Online y presencial
            </p>
            <h2 className="mb-5 font-serif text-3xl font-bold text-white md:text-4xl">
              Entrena desde casa y continúa en sala
            </h2>
            <p className="max-w-2xl leading-relaxed text-red-50/80">
              Puedes trabajar contenidos concretos a tu ritmo desde la academia online y reforzarlos después en clases
              presenciales, talleres o eventos. La idea es que cada formato sume, no que compita con el otro.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
              >
                Ver agenda
                <CalendarDays size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/45"
              >
                Contactar
              </Link>
            </div>
          </div>

          <div className="relative min-h-[320px]">
            <Image
              src={STORAGE_ASSETS.IMG_2872}
              alt="Suárez y Carmen impartiendo una clase de bachata"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              quality={74}
              className="object-cover object-[center_18%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/50 via-transparent to-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}
