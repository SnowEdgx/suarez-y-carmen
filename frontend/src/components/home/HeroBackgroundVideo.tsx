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

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const isMobileViewport = !window.matchMedia("(min-width: 768px)").matches;
    const fallbackDelayMs = isMobileViewport ? 1400 : 900;
    const idleTimeoutMs = isMobileViewport ? 2400 : 1600;

    const timeoutId = globalThis.setTimeout(() => setShouldLoadVideo(true), fallbackDelayMs);
    let idleId: number | null = null;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setShouldLoadVideo(true), { timeout: idleTimeoutMs });
    }

    return () => {
      globalThis.clearTimeout(timeoutId);
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
      preload="metadata"
      onCanPlay={() => setIsReady(true)}
      className={`absolute inset-0 h-full w-full object-cover object-[center_30%] transition-opacity duration-700 ${
        isReady ? "opacity-100" : "opacity-0"
      }`}
      src={videoUrl}
    />
  );
}
