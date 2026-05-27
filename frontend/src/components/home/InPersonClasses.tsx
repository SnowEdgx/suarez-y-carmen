import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { normalizeDisplayText } from "@/lib/display-text";
import { getPublicImageUrl, shouldBypassImageOptimization } from "@/lib/public-images";

export type InPersonClassItem = {
  id: string;
  title: string;
  city: string | null;
  venue: string | null;
  schedule: string | null;
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
  const contactHref = classes.find((classItem) => classItem.contact_url)?.contact_url || "https://www.instagram.com/suarezycarmenoficial/";

  return (
    <section id="classes" className="px-6 pb-20 pt-0 md:px-12 bg-neutral-950">
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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {classes.map((classItem, index) => {
                const title = normalizeDisplayText(classItem.title, "Clase presencial");
                const venue = normalizeDisplayText(classItem.venue);
                const imageUrl = getPublicImageUrl(classItem.image_url);

                return (
                  <article
                    key={classItem.id}
                    className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60 shadow-2xl shadow-black/20"
                  >
                    {imageUrl && (
                      <div className="relative h-[390px] bg-neutral-950 sm:h-[500px] lg:h-[540px]">
                        <Image
                          src={imageUrl}
                          alt={`Cartel de ${title}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-contain object-top"
                          priority={index === 0}
                          unoptimized={shouldBypassImageOptimization(imageUrl)}
                        />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-6 md:p-7">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                        {venue && (
                          <p className="mt-1 text-sm text-neutral-400">{venue}</p>
                        )}
                      </div>

                      {classItem.map_url && (
                        <div className="mt-auto pt-6">
                          <ActionLink href={classItem.map_url}>{"Ver ubicación"}</ActionLink>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Información y reservas</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Para confirmar plazas, horarios o nivel recomendado, contacta por el canal oficial.
                </p>
              </div>
              <ActionLink href={contactHref}>
                {contactHref.startsWith("mailto:")
                  ? "Contactar por Correo"
                  : contactHref.includes("instagram.com")
                    ? "Contactar por Instagram"
                    : "Contactar con soporte"}
              </ActionLink>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
