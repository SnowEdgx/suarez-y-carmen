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

export default function RecoverPasswordClient() {
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
        text: 'No pudimos procesar tu solicitud. Inténtalo de nuevo en unos minutos.',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />

      <main id="main-content" className="relative z-10 flex-1 px-6 pb-20 pt-32 md:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.18),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.2),#0a0a0a)]" />

        <div className="relative mx-auto w-full max-w-md border-y border-neutral-800 bg-neutral-950/80 py-8 lg:border lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">{'Recuperar contrase\u00f1a'}</h1>
            <p className="text-neutral-400">
              Introduce tu correo y solicitaremos un enlace seguro para restablecer tu acceso.
            </p>
          </div>

          {message && (
            <div
              role={message.type === 'error' ? 'alert' : 'status'}
              aria-live={message.type === 'error' ? 'assertive' : 'polite'}
              className={`mb-6 border-l px-4 py-3 text-sm font-medium leading-relaxed ${
                message.type === 'error'
                  ? 'border-red-500 bg-red-500/5 text-red-300'
                  : 'border-green-500 bg-green-500/5 text-green-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isPending}>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none"
                placeholder="tu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? 'Solicitando...' : 'Solicitar enlace de recuperación'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-400">
            <Link href="/login" className="text-white hover:text-red-500 font-semibold transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
