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
  if (classes.length === 0) return null;

  return (
    <section id="classes" className="py-24 px-6 md:px-12 bg-black/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 max-w-3xl">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">Clases presenciales</p>
          <h2 className="text-3xl md:text-5xl font-bold font-serif text-white mb-5">
            Entrena también en sala
          </h2>
          <p className="text-neutral-400 text-lg">
            Información editable desde el CMS para mantener horarios, ciudades y puntos de contacto actualizados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((classItem) => (
            <article
              key={classItem.id}
              className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60"
            >
              <div
                className="min-h-56 bg-neutral-950 bg-cover bg-center"
                style={
                  classItem.image_url
                    ? {
                        backgroundImage: `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.15)), url(${JSON.stringify(
                          classItem.image_url
                        )})`,
                      }
                    : { backgroundImage: "linear-gradient(135deg, rgba(220,38,38,.2), rgba(23,23,23,1))" }
                }
              />
              <div className="p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{classItem.title}</h3>
                    {(classItem.city || classItem.venue) && (
                      <p className="mt-1 text-sm text-neutral-400">
                        {[classItem.city, classItem.venue].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {classItem.schedule && (
                    <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
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
                    <ActionLink href={classItem.map_url}>Ver ubicación</ActionLink>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
