export function getBackendUrl() {
  const backendUrl = (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:4000"
  );

  return backendUrl.replace(/\/+$/, "");
}

export function getPublicBackendUrl() {
  const backendUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:4000"
  );

  return backendUrl.replace(/\/+$/, "");
}
