'use client'

import { useState } from 'react'
import Link from 'next/link'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import { requestPasswordRecovery } from '@/app/login/actions'

type ActionResult = {
  error?: string
  success?: string
}

export default function RecoverPasswordPage() {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = (await requestPasswordRecovery(formData)) as ActionResult

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.success })
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      setMessage({
        type: 'error',
        text: 'No pudimos procesar tu solicitud. Intentalo de nuevo en unos minutos.',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 mt-16 relative z-10 w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">{'Recuperar contrase\u00f1a'}</h1>
            <p className="text-neutral-400">
              Introduce tu correo y te enviaremos un enlace seguro para restablecer tu acceso.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm font-medium text-center ${
                message.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="email">
                Correo electronico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? 'Enviando...' : 'Enviar enlace de recuperacion'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-400">
            <Link href="/login" className="text-white hover:text-red-500 font-semibold transition-colors">
              Volver al inicio de sesion
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
