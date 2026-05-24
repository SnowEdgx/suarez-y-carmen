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
          className="mb-6 border-l border-red-500 bg-red-500/5 px-4 py-3 text-sm font-medium leading-relaxed text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {topInfoMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 border-l border-green-500 bg-green-500/5 px-4 py-3 text-sm font-medium leading-relaxed text-green-300"
        >
          {topInfoMessage.text}
        </div>
      )}
    </>
  )
}
