import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { STORAGE_ASSETS } from "@/lib/constants";
import { normalizeDisplayText } from "@/lib/display-text";
import { hasUnsafeInternalPathSegments } from "@/lib/internal-path";
import HeroBackgroundVideo from "./HeroBackgroundVideo";

export type HomeHeroContent = {
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_video_url: string | null;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
};

type HeroProps = {
  content?: HomeHeroContent | null;
};

function normalizeHref(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const href = value.trim();
  if (!href) return fallback;

  if (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !/[\r\n\t\\]/.test(href) &&
    !hasUnsafeInternalPathSegments(href)
  ) {
    return href;
  }

  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") return href;
  } catch {
    return fallback;
  }

  return fallback;
}

function HeroCta({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function normalizeHeroCtaLabel(value: string | null | undefined) {
  const label = normalizeDisplayText(value, "Ver cursos");
  const comparableLabel = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return comparableLabel.includes("catalogo") ? "Ver cursos" : label;
}

export default function Hero({ content = null }: HeroProps) {
  const eyebrow = normalizeDisplayText(content?.hero_eyebrow);
  const title = normalizeDisplayText(content?.hero_title, "Master the head movements.");
  const subtitle =
    normalizeDisplayText(
      content?.hero_subtitle,
      "Domina la sensualidad, el estilo y la conexión con Suárez y Carmen. Aprende desde casa paso a paso con cursos individuales y acceso inmediato."
    );
  const videoUrl = content?.hero_video_url || STORAGE_ASSETS.VIDEO_HERO;
  const primaryLabel = normalizeHeroCtaLabel(content?.primary_cta_label);
  const primaryHref = normalizeHref(content?.primary_cta_href, "/courses");

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      <Image
        src={STORAGE_ASSETS.IMG_2681}
        alt=""
        aria-hidden="true"
        fill
        priority
        quality={72}
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <HeroBackgroundVideo videoUrl={videoUrl} posterUrl={STORAGE_ASSETS.IMG_2681} />

      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-950 to-transparent" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 mt-16 max-w-5xl">
        {eyebrow && (
          <p className="mb-5 text-sm md:text-base uppercase tracking-[0.32em] text-red-300 font-semibold">
            {eyebrow}
          </p>
        )}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-2xl font-serif">
          {title}
        </h1>
        <h2 className="mt-6 md:mt-8 text-lg md:text-2xl text-neutral-300 font-light drop-shadow-md max-w-3xl">
          {subtitle}
        </h2>

        <div className="mt-10 md:mt-12 flex items-center justify-center">
          <HeroCta
            href={primaryHref}
            className="flex items-center gap-2 px-10 py-4 sm:px-12 sm:py-5 bg-red-600 hover:bg-red-700 text-white text-lg md:text-xl font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
          >
            {primaryLabel}
          </HeroCta>
        </div>
      </div>
    </section>
  );
}
