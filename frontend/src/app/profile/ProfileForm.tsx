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
          className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}
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
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium"
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
            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-500 rounded-xl px-4 py-3 focus:outline-none font-medium cursor-not-allowed opacity-70"
          />
          <p className="text-xs text-neutral-500 mt-1.5">El correo no se puede cambiar.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
