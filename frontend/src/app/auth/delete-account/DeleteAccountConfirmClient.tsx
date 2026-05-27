"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmAccountDeletionAction } from "@/app/profile/actions";
import Link from "next/link";

export default function DeleteAccountConfirmClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleConfirmDelete() {
    if (!token) {
      setError("Token de confirmación no válido o ausente.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await confirmAccountDeletionAction(token);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        // Redirigir después de 3 segundos para que vean el mensaje de éxito
        setTimeout(() => {
          router.push("/login?account_deleted=1");
        }, 3000);
      }
    } catch {
      setError("No pudimos completar la eliminación. Reintenta de nuevo o contacta con soporte.");
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-neutral-900/50 p-8 backdrop-blur-md shadow-2xl text-center">
        <div className="text-4xl mb-4" role="img" aria-label="Error">❌</div>
        <h1 className="text-2xl font-semibold text-white mb-3">Enlace inválido</h1>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          El enlace de confirmación es incorrecto o está incompleto. Solicita una nueva confirmación desde tu perfil.
        </p>
        <Link
          href="/profile"
          className="inline-block rounded-full bg-neutral-800 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          Volver a mi perfil
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-green-500/20 bg-neutral-900/50 p-8 backdrop-blur-md shadow-2xl text-center animate-scale-in">
        <div className="text-4xl mb-4" role="img" aria-label="Éxito">👋</div>
        <h1 className="text-2xl font-semibold text-white mb-3">Cuenta eliminada</h1>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Tu cuenta y todos tus datos asociados han sido eliminados de forma definitiva. Lamentamos verte partir.
        </p>
        <div className="text-xs text-neutral-500 animate-pulse">
          Redirigiendo a la página de inicio...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl animate-scale-in">
      <div className="flex items-center justify-center w-14 h-14 mx-auto mb-6 rounded-full bg-red-500/10 text-red-500">
        <span className="text-3xl" role="img" aria-label="Alerta">⚠️</span>
      </div>

      <h1 className="text-2xl font-semibold text-center text-white mb-3">
        Confirmación definitiva
      </h1>

      <p className="text-sm text-center text-neutral-400 mb-6 leading-relaxed">
        Estás a punto de borrar definitivamente tu cuenta de la academia. Esta acción no se puede deshacer y perderás tus compras y tu progreso para siempre.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-6 border-l border-red-500 bg-red-500/5 px-4 py-3 text-sm font-medium leading-relaxed text-red-300 rounded-r-md"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleConfirmDelete}
          disabled={isPending}
          aria-busy={isPending}
          className="w-full rounded-full bg-red-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending ? "Eliminando cuenta..." : "Sí, borrar cuenta definitivamente"}
        </button>
        
        <Link
          href="/profile"
          className="w-full text-center rounded-full border border-neutral-700 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
        >
          Cancelar y mantener mi cuenta
        </Link>
      </div>
    </div>
  );
}
