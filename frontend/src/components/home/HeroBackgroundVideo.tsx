"use client";

import { useEffect, useState } from "react";

type HeroBackgroundVideoProps = {
  videoUrl: string;
  posterUrl: string;
};

export default function HeroBackgroundVideo({ videoUrl, posterUrl }: HeroBackgroundVideoProps) {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;

    const isMobileViewport = !window.matchMedia("(min-width: 768px)").matches;
    const fallbackDelayMs = isMobileViewport ? 2200 : 1000;
    const idleTimeoutMs = isMobileViewport ? 3600 : 1800;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let idleId: number | null = null;

    function scheduleVideoLoad() {
      timeoutId = globalThis.setTimeout(() => setShouldLoadVideo(true), fallbackDelayMs);

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setShouldLoadVideo(true), { timeout: idleTimeoutMs });
      }
    }

    if (document.readyState === "complete") {
      scheduleVideoLoad();
    } else {
      window.addEventListener("load", scheduleVideoLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleVideoLoad);
      if (timeoutId) globalThis.clearTimeout(timeoutId);
      if (idleId !== null) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (!shouldLoadVideo) return null;

  return (
    <video
      aria-hidden="true"
      autoPlay
      loop
      muted
      playsInline
      poster={posterUrl}
      preload="none"
      onCanPlay={() => setIsReady(true)}
      className={`absolute inset-0 h-full w-full object-cover object-[center_30%] transition-opacity duration-700 ${
        isReady ? "opacity-100" : "opacity-0"
      }`}
      src={videoUrl}
    />
  );
}
