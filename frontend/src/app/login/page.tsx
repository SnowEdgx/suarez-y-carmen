'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { login, resendSignupVerification, signup } from './actions'
import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'

type ActionResult = {
  error?: string
  success?: string
  requiresEmailVerification?: boolean
  email?: string
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/courses'
  const isVerifiedRedirect = searchParams.get('verified') === '1'

  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData(event.currentTarget)
    const action = isLogin ? login : signup

    try {
      const result = (await action(formData)) as ActionResult | undefined

      if (result?.error) {
        setErrorMsg(result.error)
        return
      }

      if (result?.success) {
        setSuccessMsg(result.success)
      }

      if (result?.requiresEmailVerification) {
        setPendingVerificationEmail(result.email ?? (formData.get('email') as string))
        setIsLogin(true)
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      setErrorMsg('Ocurrió un error inesperado al contactar con el servidor.')
    } finally {
      setIsPending(false)
    }
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail) return

    setIsResendingVerification(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData()
    formData.append('email', pendingVerificationEmail)

    try {
      const result = (await resendSignupVerification(formData)) as ActionResult
      if (result.error) {
        setErrorMsg(result.error)
        return
      }

      if (result.success) {
        setSuccessMsg(result.success)
      }
    } finally {
      setIsResendingVerification(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 mt-16 relative z-10 w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h1>
            <p className="text-neutral-400">
              {isLogin
                ? 'Accede a tus cursos y sigue perfeccionando tu baile.'
                : 'Únete a Suárez y Carmen y domina tu estilo.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center">
              {successMsg}
            </div>
          )}

          {!successMsg && isVerifiedRedirect && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center">
              Correo verificado correctamente. Ya puedes iniciar sesión.
            </div>
          )}

          {pendingVerificationEmail && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
              <p className="text-center font-medium mb-3">Cuenta pendiente de verificación: {pendingVerificationEmail}</p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {isResendingVerification ? 'Reenviando...' : 'Reenviar correo de verificación'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="name">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
                placeholder="tu@email.com"
                defaultValue={pendingVerificationEmail ?? ''}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-sm font-medium text-neutral-400" htmlFor="password">
                  Contraseña
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all font-medium placeholder-neutral-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-neutral-400">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className="text-white hover:text-red-500 font-semibold transition-colors"
            >
              {isLogin ? 'Regístrate' : 'Inicia Sesión'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <LoginPageContent />
    </Suspense>
  )
}
