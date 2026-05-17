import Link from "next/link";
import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { STORAGE_ASSETS } from "@/lib/constants";
import HomeSectionLink from "./HomeSectionLink";

export type HomeHeroContent = {
  hero_eyebrow: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_video_url: string | null;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
};

type HeroProps = {
  content?: HomeHeroContent | null;
};

function normalizeHref(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const href = value.trim();
  if (!href) return fallback;

  if (/^#[A-Za-z0-9_-]+$/.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !/[\r\n\t]/.test(href)) return href;

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
  if (href.startsWith("#")) {
    return (
      <HomeSectionLink sectionId={href.slice(1)} className={className}>
        {children}
      </HomeSectionLink>
    );
  }

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

export default function Hero({ content = null }: HeroProps) {
  const eyebrow = content?.hero_eyebrow;
  const title = content?.hero_title || "Master the head movements.";
  const subtitle =
    content?.hero_subtitle ||
    "Domina la sensualidad, el estilo y la conexión con Suárez y Carmen. Aprende desde casa paso a paso con cursos individuales y acceso inmediato.";
  const videoUrl = content?.hero_video_url || STORAGE_ASSETS.VIDEO_HERO;
  const primaryLabel = content?.primary_cta_label || "Ver catálogo";
  const primaryHref = normalizeHref(content?.primary_cta_href, "/courses");
  const secondaryLabel = content?.secondary_cta_label || "Ver metodología";
  const secondaryHref = normalizeHref(content?.secondary_cta_href, "#methodology");

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-neutral-950">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
        src={videoUrl}
      />

      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-950 to-transparent"></div>

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

        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <HeroCta
            href={primaryHref}
            className="flex items-center gap-2 px-10 py-4 sm:px-12 sm:py-5 bg-red-600 hover:bg-red-700 text-white text-lg md:text-xl font-semibold rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
          >
            {primaryLabel}
          </HeroCta>
          <HeroCta
            href={secondaryHref}
            className="flex items-center justify-center gap-2 px-10 py-4 sm:px-12 sm:py-5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white text-lg md:text-xl font-semibold rounded-full transition-all duration-300"
          >
            <Play size={20} fill="currentColor" /> {secondaryLabel}
          </HeroCta>
        </div>
      </div>
    </section>
  );
}
