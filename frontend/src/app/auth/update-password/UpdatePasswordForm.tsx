'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { updatePassword } from '@/app/login/actions'

type ActionResult = {
  error?: string
}

export default function UpdatePasswordForm() {
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = (await updatePassword(formData)) as ActionResult | undefined
      if (result?.error) {
        setErrorMessage(result.error)
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      setErrorMessage('No pudimos actualizar tu contrase\u00f1a. Intentalo de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">{'Nueva contrase\u00f1a'}</h1>
        <p className="text-neutral-400">{'Define una contrase\u00f1a segura para volver a entrar en tu cuenta.'}</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="password">
            {'Nueva contrase\u00f1a'}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
            placeholder="Minimo 8 caracteres"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="confirmPassword">
            {'Repite la contrase\u00f1a'}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
            placeholder="Repite tu contrase\u00f1a"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Guardando...' : 'Actualizar contrase\u00f1a'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-400">
        <Link href="/login" className="text-white hover:text-red-500 font-semibold transition-colors">
          Volver al inicio de sesion
        </Link>
      </div>
    </div>
  )
}
