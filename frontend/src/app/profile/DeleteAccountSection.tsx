"use client";

import { useState } from "react";
import { requestAccountDeletionAction } from "./actions";

export default function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleRequestDeletion() {
    setIsPending(true);
    setMessage(null);
    setIsOpen(false);

    try {
      const result = await requestAccountDeletionAction();
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result?.success) {
        setMessage({ type: "success", text: result.success });
      }
    } catch {
      setMessage({ type: "error", text: "Ocurrió un error inesperado al procesar la solicitud." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Borrar cuenta</h3>
          <p className="mt-1 text-sm text-neutral-400">
            Solicita un enlace de confirmación para eliminar tu cuenta de forma definitiva.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full border border-red-500/30 bg-red-950/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/30 hover:border-red-500/50 hover:text-red-300 disabled:pointer-events-none disabled:opacity-50 shrink-0"
        >
          {isPending ? "Solicitando..." : "Solicitar borrado"}
        </button>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
          className={`mt-4 border-l px-4 py-3 text-sm font-medium leading-relaxed ${
            message.type === "error"
              ? "border-red-500 bg-red-500/5 text-red-300"
              : "border-green-500 bg-green-500/5 text-green-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl sm:p-8 animate-scale-in">
            <div className="mb-5 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
              Zona sensible
            </div>

            <h3 id="delete-account-title" className="text-xl font-semibold text-white">
              Confirma la solicitud de borrado
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Te enviaremos un correo con un enlace de un solo uso. Al confirmarlo, se eliminarán tu perfil,
              tus compras, tu progreso y los datos asociados a la cuenta.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                Enviar correo de borrado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
