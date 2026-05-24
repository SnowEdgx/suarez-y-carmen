import type { Metadata } from 'next'
import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UpdatePasswordForm from './UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Actualizar contraseña',
  description: 'Formulario seguro para definir una nueva contraseña de acceso a la academia.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />

      <main id="main-content" className="relative z-10 flex-1 px-6 pb-20 pt-32 md:px-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.18),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.2),#0a0a0a)]" />

        <section className="relative mx-auto w-full max-w-md border-y border-neutral-800 bg-neutral-950/80 py-8 lg:border lg:p-8">
          {user ? (
            <UpdatePasswordForm />
          ) : (
            <div role="alert">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-red-400">Enlace caducado</p>
              <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-white">
                Solicita un nuevo enlace
              </h1>
              <p className="leading-relaxed text-neutral-400">
                La sesión de recuperación no está activa o ha caducado. Pide un nuevo enlace para definir tu
                contraseña con seguridad.
              </p>
              <Link
                href="/auth/recover"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                Solicitar recuperación
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
