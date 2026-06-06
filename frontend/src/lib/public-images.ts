const LOCAL_IMAGE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_IMAGE_PORTS = new Set(["1337", "54321"]);
const DOCKER_HOST_GATEWAY = "host.docker.internal";

const DEFAULT_STORAGE_REWRITE_FROM_HOST = "kguoyuakfwwbvetzqtao.supabase.co";
const DEFAULT_STORAGE_REWRITE_TO_HOST = "jlpqlqvrhwdjyspwolro.supabase.co";
const DEFAULT_STORAGE_REWRITE_FROM_BUCKET = "public-assets";
const DEFAULT_STORAGE_REWRITE_TO_BUCKET = "assets";

function getEnvValue(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function normalizeStorageHost(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    if (url.username || url.password) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function normalizeBucketName(value: string) {
  const candidate = value.trim().replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9._-]+$/.test(candidate)) return null;
  return candidate;
}

function getStorageRewriteConfig() {
  const fromHost = normalizeStorageHost(
    getEnvValue("NEXT_PUBLIC_CMS_STORAGE_REWRITE_FROM_HOST", DEFAULT_STORAGE_REWRITE_FROM_HOST)
  );
  const toHost = normalizeStorageHost(
    getEnvValue("NEXT_PUBLIC_CMS_STORAGE_REWRITE_TO_HOST", DEFAULT_STORAGE_REWRITE_TO_HOST)
  );
  const fromBucket = normalizeBucketName(
    getEnvValue("NEXT_PUBLIC_CMS_STORAGE_REWRITE_FROM_BUCKET", DEFAULT_STORAGE_REWRITE_FROM_BUCKET)
  );
  const toBucket = normalizeBucketName(
    getEnvValue("NEXT_PUBLIC_CMS_STORAGE_REWRITE_TO_BUCKET", DEFAULT_STORAGE_REWRITE_TO_BUCKET)
  );

  if (!fromHost || !toHost || !fromBucket || !toBucket) return null;

  return {
    fromHost,
    toHost,
    fromPrefix: `/storage/v1/object/public/${fromBucket}/`,
    toPrefix: `/storage/v1/object/public/${toBucket}/`,
  };
}

function isFrontendRunningInDocker() {
  const internalBackendUrl = process.env.BACKEND_INTERNAL_URL ?? "";
  return process.env.RUNNING_IN_DOCKER === "true" || internalBackendUrl.includes("://backend:");
}

function rewriteConfiguredStorageUrl(url: URL): string | null {
  const rewriteConfig = getStorageRewriteConfig();
  if (!rewriteConfig) return null;
  if (url.hostname !== rewriteConfig.fromHost) return null;
  if (!url.pathname.startsWith(rewriteConfig.fromPrefix)) return null;

  const objectPath = url.pathname.slice(rewriteConfig.fromPrefix.length);
  return `https://${rewriteConfig.toHost}${rewriteConfig.toPrefix}${objectPath}`;
}

function rewriteLocalImageUrlForOptimizer(url: URL) {
  const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const isLocalSupabaseUrl =
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === DOCKER_HOST_GATEWAY) &&
    url.port === "54321";

  if (isLocalSupabaseUrl && supabaseUrlEnv) {
    try {
      const envUrl = new URL(supabaseUrlEnv);
      const isEnvUrlLocal =
        envUrl.hostname === "localhost" ||
        envUrl.hostname === "127.0.0.1" ||
        envUrl.hostname === DOCKER_HOST_GATEWAY;

      if (!isEnvUrlLocal) {
        const rewritten = new URL(url.toString());
        rewritten.protocol = envUrl.protocol;
        rewritten.host = envUrl.host;
        rewritten.port = envUrl.port;
        return rewritten.toString();
      }
    } catch (error) {
      console.error("[public-images] Invalid NEXT_PUBLIC_SUPABASE_URL parsing:", error);
    }
  }

  const isLocalStrapiUrl =
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === DOCKER_HOST_GATEWAY) &&
    url.port === "1337";

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

    const storageRewrite = rewriteConfiguredStorageUrl(url);
    if (storageRewrite) return storageRewrite;

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
