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
      className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm"
    >
      <p className="text-center font-medium mb-3">Cuenta pendiente de verificación: {email}</p>
      <button
        type="button"
        onClick={onResend}
        disabled={isResending}
        aria-busy={isResending}
        className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {isResending ? 'Reenviando...' : 'Reenviar correo de verificación'}
      </button>
    </div>
  )
}
