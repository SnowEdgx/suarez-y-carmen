"use client";

import { useState } from "react";
import { updateProfileName } from "./actions";

export default function ProfileForm({ initialName, email }: { initialName: string, email: string }) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateProfileName(formData);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result?.success) {
      setMessage({ type: 'success', text: result.success });
    }
    
    setIsPending(false);
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
    </form>
  );
}
