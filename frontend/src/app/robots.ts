import type { MetadataRoute } from "next";

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/admin", "/dashboard", "/account", "/auth", "/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
