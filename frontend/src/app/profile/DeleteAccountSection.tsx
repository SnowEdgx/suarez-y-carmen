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
          <h3 className="text-sm font-semibold text-white">Borrar cuenta permanentemente</h3>
          <p className="mt-1 text-sm text-neutral-400">
            Esta acción eliminará de forma irreversible tu acceso a los cursos comprados, tu progreso y tus datos personales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full border border-red-500/30 bg-red-950/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/30 hover:border-red-500/50 hover:text-red-300 disabled:pointer-events-none disabled:opacity-50 shrink-0"
        >
          {isPending ? "Solicitando..." : "Borrar cuenta"}
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

      {/* Confirmation Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 text-red-500">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
            </div>
            
            <h3 className="text-lg font-semibold text-center text-white mb-2">
              ¿Eliminar cuenta definitivamente?
            </h3>
            
            <p className="text-sm text-center text-neutral-400 mb-6 leading-relaxed">
              Te enviaremos un correo electrónico de confirmación. Tendrás que pulsar el enlace contenido en él para finalizar la eliminación. Perderás tus cursos, tu progreso y datos de forma irreversible.
            </p>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                Solicitar borrado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
