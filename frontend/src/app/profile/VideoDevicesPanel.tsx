"use client";

import { useState } from "react";
import { MonitorSmartphone, ShieldCheck, XCircle } from "lucide-react";
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

function formatDateTime(value: string | null) {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

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

  async function handleRevoke(deviceId: string) {
    setIsPendingId(deviceId);
    setMessage(null);

    const formData = new FormData();
    formData.append("deviceId", deviceId);

    const result = await revokeVideoDevice(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }

    setIsPendingId(null);
  }

  return (
    <section
      className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm"
      aria-busy={Boolean(isPendingId)}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <MonitorSmartphone className="text-red-500" />
            Dispositivos autorizados
          </h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-xl">
            Controla desde qué dispositivos se puede reproducir el contenido comprado.
          </p>
        </div>
        <span className="text-xs bg-red-500/10 text-red-300 px-3 py-1.5 rounded-full font-medium w-fit border border-red-500/20">
          {activeDeviceCount} de {maxActiveDevices} activos
        </span>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
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

      {!loadError && devices.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-black/35 p-5">
          <p className="text-sm text-neutral-400">
            Aún no hay dispositivos registrados. Se registrará uno cuando reproduzcas una lección comprada.
          </p>
        </div>
      )}

      {!loadError && devices.length > 0 && (
        <div className="space-y-3">
          {devices.map((device, index) => (
            <article
              key={device.id}
              className="rounded-2xl border border-neutral-800 bg-black/35 p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white">
                      {device.isCurrent ? "Este dispositivo" : `Dispositivo ${index + 1}`}
                    </span>
                    {device.isCurrent && (
                      <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-300">
                        Actual
                      </span>
                    )}
                    {device.revokedAt ? (
                      <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-800 text-neutral-400">
                        Revocado
                      </span>
                    ) : device.isActive ? (
                      <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Último uso: {formatDateTime(device.lastSeenAt)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Registrado: {formatDateTime(device.firstSeenAt)}
                  </p>
                </div>

                {!device.revokedAt && !device.isCurrent ? (
                  <button
                    type="button"
                    onClick={() => handleRevoke(device.id)}
                    disabled={isPendingId === device.id}
                    aria-busy={isPendingId === device.id}
                    aria-label={`Revocar ${device.isCurrent ? "este dispositivo" : `dispositivo ${index + 1}`}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-500/30 text-red-300 hover:text-white hover:bg-red-600 hover:border-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <XCircle size={16} aria-hidden="true" />
                    {isPendingId === device.id ? "Revocando..." : "Revocar"}
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs text-neutral-500">
                    <ShieldCheck size={16} aria-hidden="true" />
                    {device.isCurrent ? "No revocable desde aqu\u00ed" : "Sin acciones"}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
