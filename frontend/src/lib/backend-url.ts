function resolveBackendUrl(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value.replace(/\/+$/, "");
  }

  return "http://localhost:4000";
}

export function getBackendUrl() {
  return resolveBackendUrl(
    process.env.BACKEND_INTERNAL_URL,
    process.env.BACKEND_URL
  );
}

export function getPublicBackendUrl() {
  return resolveBackendUrl(
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL
  );
}
