import type { FormEvent, RefObject } from 'react'
import Link from 'next/link'

type LoginAuthFormProps = {
  formRef: RefObject<HTMLFormElement | null>
  isLoginMode: boolean
  nextPath: string
  defaultEmail: string
  isPending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function LoginAuthForm({
  formRef,
  isLoginMode,
  nextPath,
  defaultEmail,
  isPending,
  onSubmit,
}: LoginAuthFormProps) {
  return (
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
        {!isLoginMode && (
          <p className="mt-1.5 text-xs text-neutral-500">
            Mínimo 8 caracteres, con mayúsculas, minúsculas y números.
          </p>
        )}
      </div>

      {isLoginMode && (
        <label className="flex cursor-pointer items-center gap-3 border-l border-neutral-800 pl-4 text-sm text-neutral-300">
          <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              name="rememberSession"
              type="checkbox"
              value="true"
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-md border border-neutral-700 bg-neutral-950 transition-colors peer-checked:border-red-500 peer-checked:bg-red-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red-500" />
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="relative h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            >
              <path
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="font-medium text-neutral-200">
            <span className="block">Mantener sesión iniciada</span>
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
  )
}
