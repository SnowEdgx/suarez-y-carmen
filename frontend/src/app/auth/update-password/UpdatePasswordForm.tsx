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
      setErrorMessage('No pudimos actualizar tu contraseña. Inténtalo de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-red-400">Acceso seguro</p>
        <h1 className="mb-3 font-serif text-4xl font-bold tracking-tight text-white">{'Nueva contrase\u00f1a'}</h1>
        <p className="leading-relaxed text-neutral-400">
          {'Define una contrase\u00f1a segura para recuperar el acceso a tu cuenta.'}
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 border-l border-red-500 bg-red-500/5 px-4 py-3 text-sm font-medium leading-relaxed text-red-300"
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isPending}>
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
            className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none"
            placeholder="Mínimo 8 caracteres"
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Incluye mayúsculas, minúsculas y números.
          </p>
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
            className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none"
            placeholder="Repite la nueva clave"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Guardando...' : 'Actualizar contrase\u00f1a'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-400">
        <Link href="/login" className="text-white hover:text-red-500 font-semibold transition-colors">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
