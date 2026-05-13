"use client";

import { useEffect, useRef } from "react";

type SecureVideoPlayerProps = {
  src: string;
  title: string;
};

function isHlsSource(src: string) {
  return src.includes(".m3u8") || src.includes("/api/lessons/hls/");
}

export default function SecureVideoPlayer({ src, title }: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shouldUseHls = isHlsSource(src);

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
  }, [shouldUseHls, src]);

  return (
    <video
      ref={videoRef}
      aria-label={title}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(event) => event.preventDefault()}
      playsInline
      preload="metadata"
      className="w-full rounded-xl border border-neutral-700 bg-black"
      src={shouldUseHls ? undefined : src}
    />
  );
}
