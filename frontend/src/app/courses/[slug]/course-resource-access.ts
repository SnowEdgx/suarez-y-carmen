import "server-only";

import { getBackendUrl, getPublicBackendUrl } from "@/lib/backend-url";

export type CourseResourceAccess = {
  url: string | null;
  errorCode: string | null;
};

export async function resolveCourseResourceAccess(options: {
  resourceId: string;
  accessToken: string | null;
}): Promise<CourseResourceAccess> {
  const headers: HeadersInit = {};
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(
      `${getBackendUrl()}/api/course-resources/${encodeURIComponent(options.resourceId)}/view-url`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );
  } catch {
    return { url: null, errorCode: "service_unavailable" };
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      url: null,
      errorCode: typeof payload?.code === "string" ? payload.code : "resource_unavailable",
    };
  }

  if (typeof payload?.path === "string" && payload.path.startsWith("/")) {
    return { url: `${getPublicBackendUrl()}${payload.path}`, errorCode: null };
  }

  return {
    url: typeof payload?.url === "string" ? payload.url : null,
    errorCode: typeof payload?.url === "string" ? null : "resource_unavailable",
  };
}

export function resolveResourceAccessMessage(errorCode: string | null) {
  switch (errorCode) {
    case "authentication_required":
      return "Inicia sesi\u00f3n para ver este material.";
    case "email_not_verified":
      return "Verifica tu correo antes de acceder a los materiales del curso.";
    case "course_not_purchased":
      return "Este material se desbloquea al comprar el curso.";
    case "service_unavailable":
      return "No pudimos contactar con el servicio de materiales. Int\u00e9ntalo de nuevo en unos segundos.";
    case "resource_rate_limited":
      return "Se han realizado demasiadas solicitudes de material. Espera un minuto y vuelve a intentarlo.";
    case "resource_unavailable":
      return "No pudimos preparar el material ahora mismo.";
    default:
      return null;
  }
}
