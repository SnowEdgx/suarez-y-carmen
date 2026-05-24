import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { logAppError } from "@/lib/error-logging";
import { normalizeDisplayText } from "@/lib/display-text";
import { createClient } from "@/lib/supabase/server";

type EventRow = {
  id: string;
  title: string;
  city: string;
  event_date: string;
  image_url: string | null;
  location_url: string | null;
  ticket_url: string | null;
  type: string | null;
};

export const metadata: Metadata = {
  title: "Agenda",
  description: "Pr\u00f3ximos eventos, talleres y congresos de Su\u00e1rez y Carmen.",
};

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function isSafeExternalUrl(value: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function shouldBypassImageOptimization(src: string) {
  try {
    const url = new URL(src);
    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.port === "1337" || url.port === "54321")
    );
  } catch {
    return false;
  }
}

function EventActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string | null;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  if (!isSafeExternalUrl(href)) return null;

  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
      : "inline-flex items-center justify-center rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white";

  return (
    <a href={href as string} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default async function EventsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [
    {
      data: { user },
    },
    eventsResponse,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("events")
      .select("id, title, city, event_date, image_url, location_url, ticket_url, type")
      .eq("is_active", true)
      .gte("event_date", now)
      .order("event_date", { ascending: true }),
  ]);

  let events: EventRow[] = [];
  let loadError = false;

  if (eventsResponse.error) {
    loadError = true;
    logAppError("Events Page", "Could not load public events", eventsResponse.error);
  } else {
    events = (eventsResponse.data || []) as EventRow[];
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />

      <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-500">Agenda</p>
          <h1 className="mb-5 font-serif text-4xl font-bold text-white md:text-5xl">
            {"Pr\u00f3ximas fechas"}
          </h1>
          <p className="text-lg text-neutral-400">
            Consulta talleres, congresos y encuentros presenciales. La compra de entradas se realiza siempre en la
            plataforma oficial indicada por cada organizador.
          </p>
        </div>

        {loadError && (
          <div role="status" className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            {"No pudimos actualizar la agenda ahora mismo. Recarga la p\u00e1gina en unos segundos."}
          </div>
        )}

        {events.length === 0 ? (
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-8 text-neutral-400">
            <h2 className="mb-3 text-2xl font-semibold text-white">No hay eventos publicados</h2>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed">
              {"Todav\u00eda no hay nuevas fechas activas en la agenda. Puedes consultar las clases presenciales o seguir el perfil oficial de Instagram para novedades."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/classes"
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Ver clases
              </Link>
              <a
                href="https://www.instagram.com/suarezycarmenoficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Instagram oficial
              </a>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {events.map((event) => {
              const title = normalizeDisplayText(event.title, "Evento");
              const city = normalizeDisplayText(event.city, "Ubicación pendiente");
              const type = normalizeDisplayText(event.type, "Evento");

              return (
                <article
                  key={event.id}
                  className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/70 shadow-2xl shadow-black/20"
                >
                  <div className="relative h-72 bg-neutral-950">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={`Imagen de ${title}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                        unoptimized={shouldBypassImageOptimization(event.image_url)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.35),transparent_35%),linear-gradient(135deg,#171717,#050505)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                      {type}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-3 text-sm font-semibold text-red-300">{formatEventDate(event.event_date)}</p>
                    <h2 className="mb-2 text-2xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-neutral-400">{city}</p>

                    <div className="mt-auto flex flex-wrap gap-3 pt-8">
                      <EventActionLink href={event.ticket_url}>{"Ver informaci\u00f3n"}</EventActionLink>
                      <EventActionLink href={event.location_url} variant="secondary">
                        {"Ver ubicaci\u00f3n"}
                      </EventActionLink>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
