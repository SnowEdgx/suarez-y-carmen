'use client'

import { Suspense, useRef, useState } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useSearchParams } from 'next/navigation'
import Footer from '@/components/home/Footer'
import Navbar from '@/components/home/Navbar'
import LoginAlerts from './LoginAlerts'
import LoginAuthForm from './LoginAuthForm'
import LoginModeToggle from './LoginModeToggle'
import PendingVerificationNotice from './PendingVerificationNotice'
import {
  login,
  resendSignupVerification,
  requestPasswordRecovery,
  signup,
} from './actions'
import { getQueryErrorMessage, resolveTopInfoMessage } from './login-messages'
import type { ActionResult } from './login.model'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/courses'
  const callbackError = getQueryErrorMessage(searchParams.get('error'))
  const isVerifiedRedirect = searchParams.get('verified') === '1'
  const isPasswordUpdated = searchParams.get('password_updated') === '1'

  const [isLoginMode, setIsLoginMode] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [isRecoveryPending, setIsRecoveryPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const visibleErrorMessage = errorMessage ?? callbackError
  const defaultEmail = pendingVerificationEmail ?? searchParams.get('email') ?? ''
  const topInfoMessage = resolveTopInfoMessage({
    successMessage,
    isVerifiedRedirect,
    isPasswordUpdated,
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData(event.currentTarget)
    const action = isLoginMode ? login : signup

    try {
      const result = (await action(formData)) as ActionResult | undefined

      if (result?.error) {
        setErrorMessage(result.error)
        return
      }

      if (result?.success) {
        setSuccessMessage(result.success)
      }

      if (result?.requiresEmailVerification) {
        setPendingVerificationEmail(result.email ?? (formData.get('email') as string))
        setIsLoginMode(true)
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error
      }
      setErrorMessage('Ocurrió un error inesperado al contactar con el servidor.')
    } finally {
      setIsPending(false)
    }
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail) return

    setIsResendingVerification(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData()
    formData.append('email', pendingVerificationEmail)

    try {
      const result = (await resendSignupVerification(formData)) as ActionResult
      if (result.error) {
        setErrorMessage(result.error)
        return
      }

      if (result.success) {
        setSuccessMessage(result.success)
      }
    } catch {
      setErrorMessage('No pudimos solicitar un nuevo enlace. Inténtalo de nuevo en unos minutos.')
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handlePasswordRecovery(email: string) {
    setIsRecoveryPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData()
    formData.append('email', email)

    try {
      const result = (await requestPasswordRecovery(formData)) as ActionResult
      if (result.error) {
        setErrorMessage(result.error)
        return
      }

      if (result.success) {
        setSuccessMessage(result.success)
      }
    } catch {
      setErrorMessage('No pudimos iniciar la recuperación ahora mismo. Inténtalo de nuevo en unos minutos.')
    } finally {
      setIsRecoveryPending(false)
    }
  }

  function handleModeToggle() {
    setIsLoginMode(!isLoginMode)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />

      <main id="main-content" className="relative z-10 flex-1 px-6 pb-20 pt-32 md:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.18),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.2),#0a0a0a)]" />

        <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-red-400">Área de alumnos</p>
            <h1 className="mb-6 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl">
              Tu espacio para seguir entrenando.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
              Accede a tus cursos comprados, guarda tu progreso y continúa las lecciones desde el punto donde lo dejaste.
            </p>
          </div>

          <div className="relative w-full border-y border-neutral-800 bg-neutral-950/80 py-8 lg:border lg:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-white mb-2">
              {isLoginMode ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h2>
            <p className="text-neutral-400">
              {isLoginMode
                ? 'Entra para ver tus cursos y continuar tu progreso.'
                : 'Crea tu acceso para comprar cursos y guardar tu progreso.'}
            </p>
          </div>

          <LoginAlerts errorMessage={visibleErrorMessage} topInfoMessage={topInfoMessage} />
          <PendingVerificationNotice
            email={pendingVerificationEmail}
            isResending={isResendingVerification}
            onResend={handleResendVerification}
          />
          <LoginAuthForm
            formRef={formRef}
            isLoginMode={isLoginMode}
            nextPath={nextPath}
            defaultEmail={defaultEmail}
            isPending={isPending}
            isRecoveryPending={isRecoveryPending}
            onSubmit={handleSubmit}
            onPasswordRecovery={handlePasswordRecovery}
          />
          <LoginModeToggle isLoginMode={isLoginMode} onToggle={handleModeToggle} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <LoginPageContent />
    </Suspense>
  )
}
