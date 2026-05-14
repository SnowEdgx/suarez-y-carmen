import "server-only";

import { getBackendUrl, getPublicBackendUrl } from "@/lib/backend-url";
import { DEVICE_ID_HEADER, isValidDeviceId } from "@/lib/device-session";

type LessonVideoAccess = {
  url: string | null;
  errorCode: string | null;
};

export async function resolveLessonVideoAccess(options: {
  lessonId: string;
  accessToken: string | null;
  deviceId: string | null;
}): Promise<LessonVideoAccess> {
  const { lessonId, accessToken, deviceId } = options;
  const headers: HeadersInit = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (isValidDeviceId(deviceId)) {
    headers[DEVICE_ID_HEADER] = deviceId;
  }

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/lessons/${encodeURIComponent(lessonId)}/video-url`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } catch {
    return { url: null, errorCode: "service_unavailable" };
  }

  if (!response.ok) {
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      return {
        url: null,
        errorCode: typeof payload.code === "string" ? payload.code : "video_unavailable",
      };
    } catch {
      return { url: null, errorCode: "video_unavailable" };
    }
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (typeof payload?.path === "string" && payload.path.startsWith("/")) {
    return { url: `${getPublicBackendUrl()}${payload.path}`, errorCode: null };
  }

  return {
    url: typeof payload?.url === "string" ? payload.url : null,
    errorCode: typeof payload?.url === "string" ? null : "video_unavailable",
  };
}

export function resolveVideoAccessMessage(errorCode: string | null) {
  switch (errorCode) {
    case "authentication_required":
      return "Inicia sesión para acceder a esta lección.";
    case "email_not_verified":
      return "Verifica tu correo antes de acceder al contenido del curso.";
    case "course_not_purchased":
      return "Esta lección forma parte del contenido completo del curso.";
    case "missing_device_id":
      return "No pudimos validar este dispositivo. Recarga la página e inténtalo de nuevo.";
    case "device_revoked":
    case "playback_device_revoked":
      return "Este dispositivo ha sido revocado para la reproducción de vídeos.";
    case "device_limit_exceeded":
      return "Has alcanzado el límite de dispositivos activos para ver vídeos.";
    case "playback_rate_limited":
      return "Se han realizado demasiadas solicitudes de vídeo. Espera un minuto y vuelve a intentarlo.";
    case "service_unavailable":
      return "No pudimos contactar con el servicio de vídeo. Inténtalo de nuevo en unos segundos.";
    case "video_unavailable":
      return "No pudimos cargar el vídeo ahora mismo. Recarga la página en unos segundos.";
    default:
      return null;
  }
}
