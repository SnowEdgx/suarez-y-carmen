import { getBackendUrl } from "./backend-url";

export type CheckoutMessage = {
  type: "error" | "info" | "success";
  text: string;
};

export function pickSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function resolveCheckoutCodeMessage(code: string | null): CheckoutMessage | null {
  switch (code) {
    case "already_owned":
      return { type: "info", text: "Ya tienes acceso a este curso. Puedes abrirlo desde tus cursos." };
    case "invalid_course":
      return { type: "error", text: "El curso seleccionado no es v\u00e1lido." };
    case "course_not_found":
      return { type: "error", text: "No hemos encontrado ese curso o ya no est\u00e1 disponible." };
    case "service_unavailable":
      return { type: "error", text: "No pudimos contactar con el servicio de pago. Int\u00e9ntalo de nuevo en unos minutos." };
    case "rate_limited":
      return { type: "error", text: "Has realizado demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo." };
    case "forbidden":
      return { type: "error", text: "No tienes permisos para completar esta operaci\u00f3n." };
    case "error":
      return { type: "error", text: "No se pudo iniciar el pago. Vuelve a intentarlo." };
    default:
      return null;
  }
}

export async function resolveStripeReturnMessage(options: {
  sessionId: string | null;
  wasSuccessful: boolean;
  wasCanceled: boolean;
  accessToken: string | null;
}): Promise<CheckoutMessage | null> {
  const { sessionId, wasSuccessful, wasCanceled, accessToken } = options;

  if (wasCanceled) {
    return {
      type: "info",
      text: "Pago cancelado. Puedes volver a intentarlo cuando quieras.",
    };
  }

  if (!wasSuccessful) {
    return null;
  }

  if (!sessionId) {
    return {
      type: "info",
      text: "Pago recibido. Estamos validando tu acceso, recarga la p\u00e1gina en unos segundos.",
    };
  }

  if (!accessToken) {
    return {
      type: "error",
      text: "Tu sesi\u00f3n no est\u00e1 activa. Inicia sesi\u00f3n para confirmar tu acceso al curso comprado.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${getBackendUrl()}/api/stripe/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );
  } catch {
    return {
      type: "error",
      text: "No pudimos verificar el estado del pago en este momento. Recarga la p\u00e1gina en unos segundos.",
    };
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    return {
      type: "error",
      text: "Tu sesi\u00f3n ha caducado. Inicia sesi\u00f3n de nuevo para ver tus cursos.",
    };
  }

  if (response.status === 403 || response.status === 404) {
    return {
      type: "error",
      text: "No pudimos verificar esta sesi\u00f3n de pago para tu usuario.",
    };
  }

  if (!response.ok) {
    return {
      type: "error",
      text: "No pudimos validar el pago ahora mismo. Recarga la p\u00e1gina en unos segundos.",
    };
  }

  const status = typeof payload?.status === "string" ? payload.status : null;
  const accessGranted = Boolean(payload?.accessGranted);

  if (status === "paid" && accessGranted) {
    return {
      type: "success",
      text: "Pago confirmado. Tu acceso al curso ya est\u00e1 activo.",
    };
  }

  if (status === "paid" && !accessGranted) {
    return {
      type: "info",
      text: "Pago confirmado, pero el acceso a\u00fan se est\u00e1 sincronizando. Recarga en unos segundos.",
    };
  }

  if (status === "pending") {
    return {
      type: "info",
      text: "El pago sigue en proceso. Te avisaremos cuando quede confirmado.",
    };
  }

  if (status === "canceled") {
    return {
      type: "info",
      text: "La sesi\u00f3n de pago no se ha completado. Puedes volver a intentarlo cuando quieras.",
    };
  }

  return {
    type: "error",
    text: "Estado de pago no reconocido. Contacta con soporte si el acceso no aparece.",
  };
}
