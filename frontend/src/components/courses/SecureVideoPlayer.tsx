"use client";

import { useEffect, useRef, useState } from "react";

type SecureVideoPlayerProps = {
  src: string;
  title: string;
};

function isHlsSource(src: string) {
  return src.includes(".m3u8") || src.includes("/api/lessons/hls/");
}

export default function SecureVideoPlayer({ src, title }: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const shouldUseHls = isHlsSource(src);

  useEffect(() => {
    setHasPlaybackError(false);
  }, [src]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !shouldUseHls) return;

    let hlsInstance: { destroy: () => void } | null = null;
    let isMounted = true;

    if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = src;
      return;
    }

    import("hls.js")
      .then(({ default: Hls }) => {
        if (!isMounted || !Hls.isSupported()) {
          videoElement.src = src;
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsInstance = hls;
        hls.on(Hls.Events.ERROR, (_event, data: { fatal?: boolean }) => {
          if (data?.fatal && isMounted) {
            setHasPlaybackError(true);
          }
        });
        hls.loadSource(src);
        hls.attachMedia(videoElement);
      })
      .catch(() => {
        videoElement.src = src;
      });

    return () => {
      isMounted = false;
      hlsInstance?.destroy();
      hlsInstance = null;
      videoElement.removeAttribute("src");
      videoElement.load();
    };
  }, [reloadNonce, shouldUseHls, src]);

  return (
    <div className="relative mx-auto max-w-[330px] overflow-hidden rounded-xl border border-neutral-700 bg-black shadow-2xl shadow-black/30 sm:max-w-[360px] lg:max-w-[380px]">
      <video
        key={`${src}-${reloadNonce}`}
        ref={videoRef}
        aria-label={title}
        title={title}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(event) => event.preventDefault()}
        onError={() => setHasPlaybackError(true)}
        playsInline
        preload="metadata"
        className="aspect-[9/16] max-h-[66vh] w-full bg-black object-contain"
        src={shouldUseHls ? undefined : src}
      >
        Tu navegador no puede reproducir este vídeo.
      </video>

      {hasPlaybackError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 px-6 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-medium text-white">No se pudo reproducir el vídeo.</p>
            <p className="mt-2 text-xs leading-5 text-neutral-400">
              Comprueba tu conexión y vuelve a intentarlo. Si el problema continúa, contacta con soporte.
            </p>
            <button
              type="button"
              onClick={() => {
                setHasPlaybackError(false);
                setReloadNonce((current) => current + 1);
              }}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
