import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type InPersonClassItem = {
  id: string;
  title: string;
  city: string | null;
  venue: string | null;
  schedule: string | null;
  description: string | null;
  image_url: string | null;
  map_url: string | null;
  contact_url: string | null;
};

type InPersonClassesProps = {
  classes: InPersonClassItem[];
};

function ActionLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className = "text-sm font-semibold text-red-300 hover:text-red-200 transition-colors";
  const trimmedHref = href.trim();

  if (/^#[A-Za-z0-9_-]+$/.test(trimmedHref) || (trimmedHref.startsWith("/") && !trimmedHref.startsWith("//"))) {
    return (
      <Link href={trimmedHref} className={className}>
        {children}
      </Link>
    );
  }

  try {
    const url = new URL(trimmedHref);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return (
    <a href={trimmedHref} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default function InPersonClasses({ classes }: InPersonClassesProps) {
  return (
    <section id="classes" className="py-24 px-6 md:px-12 bg-neutral-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 max-w-3xl">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">Clases presenciales</p>
          <h1 className="text-3xl md:text-5xl font-bold font-serif text-white mb-5">
            {"Entrena en sala con Su\u00e1rez y Carmen"}
          </h1>
          <p className="text-neutral-400 text-lg">
            Consulta las sedes activas y contacta por el canal oficial para confirmar disponibilidad.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-8 text-neutral-400">
            {"Todav\u00eda no hay clases presenciales publicadas."}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {classes.map((classItem) => (
              <article
                key={classItem.id}
                className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20"
              >
                {classItem.image_url && (
                  <div className="relative h-[520px] sm:h-[680px] bg-neutral-950">
                    <Image
                      src={classItem.image_url}
                      alt={`Cartel de ${classItem.title}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain"
                      priority={classes.length <= 2}
                    />
                  </div>
                )}

                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{classItem.title}</h2>
                      {(classItem.city || classItem.venue) && (
                        <p className="mt-1 text-sm text-neutral-400">
                          {[classItem.city, classItem.venue].filter(Boolean).join(" \u00b7 ")}
                        </p>
                      )}
                    </div>
                    {classItem.schedule && (
                      <span className="w-fit rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                        {classItem.schedule}
                      </span>
                    )}
                  </div>

                  {classItem.description && (
                    <p className="mt-5 text-sm leading-relaxed text-neutral-400">
                      {classItem.description}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-4">
                    {classItem.contact_url && (
                      <ActionLink href={classItem.contact_url}>Contactar</ActionLink>
                    )}
                    {classItem.map_url && (
                      <ActionLink href={classItem.map_url}>{"Ver ubicaci\u00f3n"}</ActionLink>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
