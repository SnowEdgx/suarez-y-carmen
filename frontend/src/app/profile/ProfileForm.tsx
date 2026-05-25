"use client";

import { useState } from "react";
import { requestOwnPasswordChange, updateProfileName } from "./actions";

export default function ProfileForm({ initialName, email }: { initialName: string, email: string }) {
  const [isPending, setIsPending] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await updateProfileName(formData);

      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else if (result?.success) {
        setMessage({ type: 'success', text: result.success });
      }
    } catch {
      setMessage({ type: 'error', text: 'No pudimos guardar los cambios. Inténtalo de nuevo.' });
    } finally {
      setIsPending(false);
    }
  }

  async function handlePasswordChangeRequest() {
    setIsPasswordPending(true);
    setPasswordMessage(null);

    try {
      const result = await requestOwnPasswordChange();

      if (result?.error) {
        setPasswordMessage({ type: 'error', text: result.error });
      } else if (result?.success) {
        setPasswordMessage({ type: 'success', text: result.success });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'No pudimos solicitar el cambio. Inténtalo de nuevo.' });
    } finally {
      setIsPasswordPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending}>
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live={message.type === 'error' ? 'assertive' : 'polite'}
          className={`border-l px-4 py-3 text-sm font-medium leading-relaxed ${message.type === 'error' ? 'border-red-500 bg-red-500/5 text-red-300' : 'border-green-500 bg-green-500/5 text-green-300'}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="fullName">
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={initialName}
            className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white transition-colors focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            disabled
            defaultValue={email}
            className="w-full cursor-not-allowed border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-neutral-500 opacity-70 focus:outline-none"
          />
          <p className="text-xs text-neutral-500 mt-1.5">El correo no se puede cambiar.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full bg-red-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="border-t border-neutral-800 pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Contraseña</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Te enviaremos un enlace seguro a tu correo para cambiarla.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePasswordChangeRequest}
            disabled={isPasswordPending}
            aria-busy={isPasswordPending}
            className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:pointer-events-none disabled:opacity-50"
          >
            {isPasswordPending ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </div>

        {passwordMessage && (
          <div
            role={passwordMessage.type === 'error' ? 'alert' : 'status'}
            aria-live={passwordMessage.type === 'error' ? 'assertive' : 'polite'}
            className={`mt-4 border-l px-4 py-3 text-sm font-medium leading-relaxed ${passwordMessage.type === 'error' ? 'border-red-500 bg-red-500/5 text-red-300' : 'border-green-500 bg-green-500/5 text-green-300'}`}
          >
            {passwordMessage.text}
          </div>
        )}
      </div>
    </form>
  );
}
