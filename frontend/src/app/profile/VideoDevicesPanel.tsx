"use client";

import { useState } from "react";
import { ChevronDown, MonitorSmartphone, ShieldCheck, XCircle } from "lucide-react";
import { revokeVideoDevice } from "./actions";

type VideoDevice = {
  id: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
  isActive: boolean;
};

type VideoDevicesPanelProps = {
  devices: VideoDevice[];
  activeDeviceCount: number;
  maxActiveDevices: number;
  loadError: string | null;
};

function formatLastUse(value: string | null) {
  if (!value) return "Sin uso reciente";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin uso reciente";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function VideoDevicesPanel({
  devices,
  activeDeviceCount,
  maxActiveDevices,
  loadError,
}: VideoDevicesPanelProps) {
  const [isPendingId, setIsPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const activeDevices = devices.filter((device) => device.isActive && !device.revokedAt);

  async function handleRevoke(deviceId: string) {
    setIsPendingId(deviceId);
    setMessage(null);

    const formData = new FormData();
    formData.append("deviceId", deviceId);

    const result = await revokeVideoDevice(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: "Dispositivo liberado." });
    }

    setIsPendingId(null);
  }

  return (
    <section aria-busy={Boolean(isPendingId)}>
      <details className="group rounded-3xl border border-neutral-800 bg-neutral-900/35 p-6 backdrop-blur-sm sm:p-8">
        <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <MonitorSmartphone className="text-red-500" aria-hidden="true" />
              Seguridad de reproducción
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
              Para proteger tus cursos, la reproducción se limita a {maxActiveDevices} dispositivos. Si cambias de móvil u ordenador, puedes liberar uno antiguo desde aquí.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300">
            {activeDeviceCount} de {maxActiveDevices} en uso
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="mt-6 space-y-4 border-t border-neutral-800 pt-6">
          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              aria-live={message.type === "error" ? "assertive" : "polite"}
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.type === "error"
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-green-500/20 bg-green-500/10 text-green-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {loadError}
            </div>
          )}

          {!loadError && activeDevices.length === 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-black/25 p-5">
              <p className="text-sm text-neutral-400">
                Aún no hay dispositivos vinculados. Se añadirá uno automáticamente cuando reproduzcas una lección comprada.
              </p>
            </div>
          )}

          {!loadError && activeDevices.length > 0 && (
            <div className="space-y-3">
              {activeDevices.map((device, index) => (
                <article
                  key={device.id}
                  className="rounded-2xl border border-neutral-800 bg-black/25 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {device.isCurrent ? "Este dispositivo" : `Dispositivo ${index + 1}`}
                        </span>
                        {device.isCurrent && (
                          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-green-300">
                            En uso
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        Último acceso: {formatLastUse(device.lastSeenAt)}
                      </p>
                    </div>

                    {!device.isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleRevoke(device.id)}
                        disabled={isPendingId === device.id}
                        aria-busy={isPendingId === device.id}
                        aria-label={`Liberar dispositivo ${index + 1}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                      >
                        <XCircle size={16} aria-hidden="true" />
                        {isPendingId === device.id ? "Liberando..." : "Liberar"}
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-neutral-500">
                        <ShieldCheck size={16} aria-hidden="true" />
                        Dispositivo actual
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
