import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR || ".next-build";

function getCmsRemotePattern() {
  const rawUrl = process.env.NEXT_PUBLIC_CMS_URL || process.env.CMS_PUBLIC_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
}

const cmsRemotePattern = getCmsRemotePattern();

const nextConfig: NextConfig = {
  distDir,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "jlpqlqvrhwdjyspwolro.supabase.co",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cms.suarezycarmenbachata.com",
        pathname: "/uploads/**",
      },
      ...(cmsRemotePattern ? [cmsRemotePattern] : []),
    ],
  },
};

export default nextConfig;
