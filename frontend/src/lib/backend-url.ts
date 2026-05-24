const LOCAL_BACKEND_URL = "http://localhost:4000";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function normalizeHttpUrl(value: string, name: string) {
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

function resolveBackendUrl(name: string, ...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return normalizeHttpUrl(value, name);
  }

  if (isProduction()) {
    throw new Error(`${name} is required in production.`);
  }

  return LOCAL_BACKEND_URL;
}

export function getBackendUrl() {
  return resolveBackendUrl(
    "BACKEND_INTERNAL_URL or BACKEND_URL",
    process.env.BACKEND_INTERNAL_URL,
    process.env.BACKEND_URL
  );
}

export function getPublicBackendUrl() {
  return resolveBackendUrl(
    "NEXT_PUBLIC_BACKEND_URL or BACKEND_URL",
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL
  );
}
