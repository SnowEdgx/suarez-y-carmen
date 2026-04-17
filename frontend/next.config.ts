import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR || ".next-build";

const nextConfig: NextConfig = {
  distDir,
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
    ],
  },
};

export default nextConfig;
