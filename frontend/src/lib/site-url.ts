const LOCAL_SITE_URL = "http://localhost:3000";

function requiresExplicitProductionUrl() {
  return process.env.VERCEL_ENV === "production" || process.env.REQUIRE_PRODUCTION_URLS === "true";
}

function normalizeBaseHttpUrl(value: string, name: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported URL protocol.");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("URL must not contain credentials, query or hash.");
    }

    return value.replace(/\/+$/, "");
  } catch {
    throw new Error(`${name} must be a valid HTTP URL.`);
  }
}

export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return normalizeBaseHttpUrl(configuredSiteUrl, "NEXT_PUBLIC_SITE_URL");
  }

  if (requiresExplicitProductionUrl()) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  return LOCAL_SITE_URL;
}

export function getSiteUrlFromRequestOrigin(origin: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return normalizeBaseHttpUrl(configuredSiteUrl, "NEXT_PUBLIC_SITE_URL");
  }

  if (origin && !origin.includes("0.0.0.0")) {
    return normalizeBaseHttpUrl(origin, "request origin");
  }

  if (requiresExplicitProductionUrl()) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  return LOCAL_SITE_URL;
}
