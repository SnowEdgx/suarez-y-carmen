import type { Metadata } from 'next'
import RecoverPasswordClient from './RecoverPasswordClient'

export const metadata: Metadata = {
  title: 'Recuperar contrase\u00f1a',
  description: 'Solicitud segura de recuperaci\u00f3n de contrase\u00f1a para alumnos registrados.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RecoverPasswordPage() {
  return <RecoverPasswordClient />
}
