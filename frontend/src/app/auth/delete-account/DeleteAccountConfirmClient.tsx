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
      setError("El enlace de confirmación no es válido o está incompleto.");
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
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-5 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
          Enlace no válido
        </div>
        <h1 className="mb-3 text-2xl font-semibold text-white">Enlace inválido</h1>
        <p className="mb-6 text-sm leading-relaxed text-neutral-400">
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
      <div className="w-full max-w-md rounded-3xl border border-green-500/20 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-md animate-scale-in">
        <div className="mb-5 inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-green-300">
          Confirmado
        </div>
        <h1 className="mb-3 text-2xl font-semibold text-white">Cuenta eliminada</h1>
        <p className="mb-6 text-sm leading-relaxed text-neutral-400">
          Tu cuenta y los datos asociados se han eliminado correctamente.
        </p>
        <div className="text-xs text-neutral-500 animate-pulse">
          Redirigiendo al inicio de sesión...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl animate-scale-in">
      <div className="mb-5 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
        Confirmación necesaria
      </div>

      <h1 className="mb-3 text-2xl font-semibold text-white">Confirmar eliminación de cuenta</h1>

      <p className="mb-6 text-sm leading-relaxed text-neutral-400">
        Esta confirmación eliminará tu cuenta de alumno, tus compras y tu progreso. Si no quieres continuar,
        vuelve a tu perfil y no uses este enlace.
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
          {isPending ? "Eliminando cuenta..." : "Sí, eliminar mi cuenta"}
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
