const LOCAL_IMAGE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_IMAGE_PORTS = new Set(["1337", "54321"]);
const DOCKER_HOST_GATEWAY = "host.docker.internal";

/**
 * CMS Supabase project (k) → Production Supabase project (j).
 * The CMS stores uploads in bucket "public-assets" but in production
 * they are served from bucket "assets" on the production project.
 */
const CMS_SUPABASE_HOST = "kguoyuakfwwbvetzqtao.supabase.co";
const PROD_SUPABASE_HOST = "jlpqlqvrhwdjyspwolro.supabase.co";
const CMS_BUCKET_PREFIX = "/storage/v1/object/public/public-assets/";
const PROD_BUCKET_PREFIX = "/storage/v1/object/public/assets/";

function isFrontendRunningInDocker() {
  const internalBackendUrl = process.env.BACKEND_INTERNAL_URL ?? "";
  return process.env.RUNNING_IN_DOCKER === "true" || internalBackendUrl.includes("://backend:");
}

/**
 * Rewrites CMS Supabase storage URLs to production Supabase storage URLs.
 * Converts: https://kguoyuakfwwbvetzqtao.supabase.co/storage/v1/object/public/public-assets/...
 *       To: https://jlpqlqvrhwdjyspwolro.supabase.co/storage/v1/object/public/assets/...
 */
function rewriteCmsStorageUrl(url: URL): string | null {
  if (url.hostname !== CMS_SUPABASE_HOST) return null;
  if (!url.pathname.startsWith(CMS_BUCKET_PREFIX)) return null;

  const objectPath = url.pathname.slice(CMS_BUCKET_PREFIX.length);
  return `https://${PROD_SUPABASE_HOST}${PROD_BUCKET_PREFIX}${objectPath}`;
}

function rewriteLocalImageUrlForOptimizer(url: URL) {
  const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  
  // Check if the URL points to local Supabase storage (port 54321)
  const isLocalSupabaseUrl = (
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === DOCKER_HOST_GATEWAY) &&
    url.port === "54321"
  );

  if (isLocalSupabaseUrl && supabaseUrlEnv) {
    try {
      const envUrl = new URL(supabaseUrlEnv);
      const isEnvUrlLocal = (
        envUrl.hostname === "localhost" ||
        envUrl.hostname === "127.0.0.1" ||
        envUrl.hostname === DOCKER_HOST_GATEWAY
      );

      // If the database gives us a local URL but we are connected to a remote Supabase Cloud instance,
      // rewrite it dynamically to fetch from the remote storage bucket.
      if (!isEnvUrlLocal) {
        const rewritten = new URL(url.toString());
        rewritten.protocol = envUrl.protocol;
        rewritten.host = envUrl.host;
        rewritten.port = envUrl.port;
        
        return rewritten.toString();
      }
    } catch (e) {
      console.error("[public-images] Invalid NEXT_PUBLIC_SUPABASE_URL parsing:", e);
    }
  }

  // Check if the URL points to local Strapi CMS (port 1337)
  const isLocalStrapiUrl = (
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === DOCKER_HOST_GATEWAY) &&
    url.port === "1337"
  );

  if (isLocalStrapiUrl) {
    const rewritten = new URL(url.toString());
    rewritten.protocol = "https";
    rewritten.host = "cms.suarezycarmenbachata.com";
    rewritten.port = "";
    return rewritten.toString();
  }

  if (!isFrontendRunningInDocker()) {
    if (url.hostname === DOCKER_HOST_GATEWAY) {
      const rewrittenUrl = new URL(url.toString());
      rewrittenUrl.hostname = "localhost";
      return rewrittenUrl.toString();
    }
    return url.toString();
  }

  if (!LOCAL_IMAGE_HOSTS.has(url.hostname) || !LOCAL_IMAGE_PORTS.has(url.port)) return url.toString();

  const rewrittenUrl = new URL(url.toString());
  rewrittenUrl.hostname = DOCKER_HOST_GATEWAY;
  return rewrittenUrl.toString();
}

export function getPublicImageUrl(value: string | null | undefined, fallback: string | null = null) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return fallback;

  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    if (url.username || url.password) return fallback;

    // Rewrite CMS Supabase storage URLs to production bucket
    const cmsRewrite = rewriteCmsStorageUrl(url);
    if (cmsRewrite) return cmsRewrite;

    return rewriteLocalImageUrlForOptimizer(url);
  } catch {
    return fallback;
  }
}

export function shouldBypassImageOptimization(src: string) {
  try {
    const url = new URL(src);
    return (
      (LOCAL_IMAGE_HOSTS.has(url.hostname) || url.hostname === DOCKER_HOST_GATEWAY) &&
      LOCAL_IMAGE_PORTS.has(url.port) &&
      isFrontendRunningInDocker()
    );
  } catch {
    return false;
  }
}
