import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Iniciar sesi\u00f3n',
  description: 'Acceso privado para alumnos registrados de la academia Su\u00e1rez y Carmen.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginPage() {
  return <LoginClient />
}
