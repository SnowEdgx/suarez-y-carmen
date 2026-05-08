export function getBackendUrl() {
  return (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:4000"
  );
}
