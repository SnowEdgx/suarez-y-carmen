type LoginModeToggleProps = {
  isLoginMode: boolean
  onToggle: () => void
}

export default function LoginModeToggle({ isLoginMode, onToggle }: LoginModeToggleProps) {
  return (
    <div className="mt-8 text-center text-sm text-neutral-400">
      {isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
      <button
        type="button"
        onClick={onToggle}
        className="text-white hover:text-red-500 font-semibold transition-colors"
      >
        {isLoginMode ? 'Crear cuenta' : 'Inicia sesión'}
      </button>
    </div>
  )
}
