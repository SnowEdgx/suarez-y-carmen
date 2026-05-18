export type ActionResult = {
  error?: string
  success?: string
  requiresEmailVerification?: boolean
  email?: string
}

export type LoginMode = 'login' | 'signup'

export type TopInfoMessage = {
  type: 'success'
  text: string
}
