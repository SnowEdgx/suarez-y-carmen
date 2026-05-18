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

      <main id="main-content" className="flex-1 flex items-center justify-center p-6 mt-16 relative z-10 w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">
              {isLoginMode ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h1>
            <p className="text-neutral-400">
              {isLoginMode
                ? 'Accede a tus cursos y sigue perfeccionando tu baile.'
                : 'Únete a Suárez y Carmen y domina tu estilo.'}
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
