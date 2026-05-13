"use client";

type SecureVideoPlayerProps = {
  src: string;
  title: string;
};

export default function SecureVideoPlayer({ src, title }: SecureVideoPlayerProps) {
  return (
    <video
      aria-label={title}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(event) => event.preventDefault()}
      playsInline
      preload="metadata"
      className="w-full rounded-xl border border-neutral-700 bg-black"
      src={src}
    />
  );
}
