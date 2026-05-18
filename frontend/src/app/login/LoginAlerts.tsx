import type { TopInfoMessage } from './login.model'

type LoginAlertsProps = {
  errorMessage: string | null
  topInfoMessage: TopInfoMessage | null
}

export default function LoginAlerts({ errorMessage, topInfoMessage }: LoginAlertsProps) {
  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center"
        >
          {errorMessage}
        </div>
      )}

      {topInfoMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center"
        >
          {topInfoMessage.text}
        </div>
      )}
    </>
  )
}
