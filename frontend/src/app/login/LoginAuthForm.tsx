import type { FormEvent, RefObject } from 'react'
import Link from 'next/link'

type LoginAuthFormProps = {
  formRef: RefObject<HTMLFormElement | null>
  isLoginMode: boolean
  nextPath: string
  defaultEmail: string
  isPending: boolean
  isRecoveryPending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPasswordRecovery: (email: string) => void
}

export default function LoginAuthForm({
  formRef,
  isLoginMode,
  nextPath,
  defaultEmail,
  isPending,
  isRecoveryPending,
  onSubmit,
  onPasswordRecovery,
}: LoginAuthFormProps) {
  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" aria-busy={isPending}>
        <input type="hidden" name="next" value={nextPath} />

        {!isLoginMode && (
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1.5" htmlFor="name">
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none"
              placeholder="Nombre y apellidos"
            />
          </div>
        )}

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
            defaultValue={defaultEmail}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-neutral-400" htmlFor="password">
              Contraseña
            </label>
            {isLoginMode && (
              <Link href="/auth/recover" className="text-xs text-neutral-400 hover:text-white transition-colors">
                He olvidado mi contraseña
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isLoginMode ? undefined : 8}
            className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 font-medium text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none"
            placeholder="********"
          />
          {!isLoginMode && <p className="mt-1.5 text-xs text-neutral-500">Mínimo 8 caracteres.</p>}
        </div>

        {isLoginMode && (
          <label className="flex items-start gap-3 border-l border-neutral-800 pl-4 text-sm text-neutral-400">
            <input
              name="rememberSession"
              type="checkbox"
              value="true"
              className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-red-600 focus:ring-red-600/40"
            />
            <span>
              <span className="block font-medium text-neutral-200">Mantener sesión iniciada</span>
              <span className="block text-xs text-neutral-500">No recomendado en ordenadores compartidos.</span>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full py-3.5 mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Cargando...' : isLoginMode ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>

      {isLoginMode && (
        <button
          type="button"
          onClick={() => {
            const currentEmail = formRef.current ? new FormData(formRef.current).get('email') : defaultEmail
            onPasswordRecovery(typeof currentEmail === 'string' ? currentEmail : defaultEmail)
          }}
          disabled={isRecoveryPending}
          aria-busy={isRecoveryPending}
          className="mt-3 w-full text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-60"
        >
          {isRecoveryPending
            ? 'Solicitando recuperación...'
            : 'Solicitar recuperación de contraseña'}
        </button>
      )}
    </>
  )
}
