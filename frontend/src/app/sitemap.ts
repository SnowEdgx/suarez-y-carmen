import type { MetadataRoute } from "next";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_ROUTES = [
  "",
  "/courses",
  "/classes",
  "/events",
  "/faq",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
] as const;

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

type CourseSitemapRow = {
  slug: string;
  updated_at: string | null;
};

async function loadPublishedCourseRoutes(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    logAppError("Sitemap", "Could not load published courses", error);
    return [];
  }

  return ((data || []) as CourseSitemapRow[])
    .filter((course) => course.slug)
    .map((course) => ({
      url: `${siteUrl}/courses/${course.slug}`,
      lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const courseRoutes = await loadPublishedCourseRoutes(siteUrl);

  return [...staticRoutes, ...courseRoutes];
}
