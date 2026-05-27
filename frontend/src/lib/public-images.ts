const LOCAL_IMAGE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_IMAGE_PORTS = new Set(["1337", "54321"]);
const DOCKER_HOST_GATEWAY = "host.docker.internal";

function isFrontendRunningInDocker() {
  const internalBackendUrl = process.env.BACKEND_INTERNAL_URL ?? "";
  return process.env.RUNNING_IN_DOCKER === "true" || internalBackendUrl.includes("://backend:");
}

function rewriteLocalImageUrlForOptimizer(url: URL) {
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

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    if (url.username || url.password) return fallback;

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
