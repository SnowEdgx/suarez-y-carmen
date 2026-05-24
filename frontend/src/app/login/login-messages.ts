import type { TopInfoMessage } from './login.model'

export function getQueryErrorMessage(code: string | null) {
  switch (code) {
    case 'verify_email_required':
      return 'Debes verificar tu correo antes de iniciar sesión. Si no recibiste el enlace, solicita uno nuevo.'
    case 'oauth_failed':
      return 'No pudimos completar el acceso externo. Inténtalo de nuevo.'
    case 'invalid_or_expired_link':
      return 'El enlace de verificación no es válido o ha caducado.'
    case 'auth_callback_failed':
      return 'No pudimos validar tu sesión. Intenta acceder de nuevo.'
    default:
      return null
  }
}

export function resolveTopInfoMessage(options: {
  successMessage: string | null
  isVerifiedRedirect: boolean
  isPasswordUpdated: boolean
}): TopInfoMessage | null {
  const { successMessage, isVerifiedRedirect, isPasswordUpdated } = options

  if (successMessage) return { type: 'success', text: successMessage }
  if (isVerifiedRedirect) {
    return { type: 'success', text: 'Correo verificado correctamente. Ya puedes iniciar sesión.' }
  }
  if (isPasswordUpdated) {
    return { type: 'success', text: 'Contraseña actualizada. Ya puedes iniciar sesión.' }
  }

  return null
}
