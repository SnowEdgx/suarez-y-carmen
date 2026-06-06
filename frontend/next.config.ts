import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR || ".next";

function getCmsRemotePattern() {
  const rawUrl = process.env.NEXT_PUBLIC_CMS_URL || process.env.CMS_PUBLIC_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

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

function getSupabasePublicStorageRemotePattern() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

function getSupabaseStorageHostRemotePattern(rawHost: string | undefined) {
  const value = rawHost?.trim();
  if (!value) return null;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const cmsRemotePattern = getCmsRemotePattern();
const supabasePublicStorageRemotePattern = getSupabasePublicStorageRemotePattern();
const storageRewriteRemotePatterns = [
  getSupabaseStorageHostRemotePattern(process.env.NEXT_PUBLIC_CMS_STORAGE_REWRITE_FROM_HOST),
  getSupabaseStorageHostRemotePattern(process.env.NEXT_PUBLIC_CMS_STORAGE_REWRITE_TO_HOST),
].filter((pattern): pattern is NonNullable<ReturnType<typeof getSupabaseStorageHostRemotePattern>> => Boolean(pattern));

const nextConfig: NextConfig = {
  distDir,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
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
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 160, 240, 320, 480],
    qualities: [72, 74, 75, 76],
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jlpqlqvrhwdjyspwolro.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "kguoyuakfwwbvetzqtao.supabase.co",
        pathname: "/storage/v1/object/public/**",
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
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "host.docker.internal",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "host.docker.internal",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "cms",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cms.suarezycarmenbachata.com",
        pathname: "/uploads/**",
      },
      ...(cmsRemotePattern ? [cmsRemotePattern] : []),
      ...(supabasePublicStorageRemotePattern ? [supabasePublicStorageRemotePattern] : []),
      ...storageRewriteRemotePatterns,
    ],
  },
};

export default nextConfig;
