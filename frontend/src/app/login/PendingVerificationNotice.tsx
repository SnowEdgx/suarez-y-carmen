type PendingVerificationNoticeProps = {
  email: string | null
  isResending: boolean
  onResend: () => void
}

export default function PendingVerificationNotice({
  email,
  isResending,
  onResend,
}: PendingVerificationNoticeProps) {
  if (!email) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 border-l border-amber-400 bg-amber-400/5 px-4 py-3 text-sm text-amber-100"
    >
      <p className="font-semibold text-white">Verificación pendiente</p>
      <p className="mt-1 leading-relaxed text-amber-100/80">
        El acceso al área privada queda bloqueado hasta confirmar <span className="font-medium text-amber-50">{email}</span>.
        Si no lo ves en unos minutos, revisa spam, solicita otro enlace o contacta con soporte.
      </p>
      <button
        type="button"
        onClick={onResend}
        disabled={isResending}
        aria-busy={isResending}
        className="mt-3 text-sm font-semibold text-amber-50 underline-offset-4 transition-colors hover:text-white hover:underline disabled:pointer-events-none disabled:opacity-50"
      >
        {isResending ? 'Solicitando...' : 'Solicitar nuevo enlace'}
      </button>
    </div>
  )
}
