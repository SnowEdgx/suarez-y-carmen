export type AuthEmailUser = {
  email_confirmed_at?: string | null
  confirmed_at?: string | null
} | null | undefined

export function isEmailVerified(user: AuthEmailUser) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at)
}
