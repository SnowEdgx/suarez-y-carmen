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
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setShouldLoadVideo(true), { timeout: 1600 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(() => setShouldLoadVideo(true), 900);
    return () => globalThis.clearTimeout(timeoutId);
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
