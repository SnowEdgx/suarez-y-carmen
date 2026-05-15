import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UpdatePasswordForm from './UpdatePasswordForm'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />

      <main id="main-content" className="flex-1 flex items-center justify-center p-6 mt-16 relative z-10 w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />

        {user ? (
          <UpdatePasswordForm />
        ) : (
          <div
            role="alert"
            className="relative w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl shadow-2xl text-center"
          >
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Enlace no válido</h1>
            <p className="text-neutral-400">
              La sesión de recuperación no está activa o ha caducado. Solicita un nuevo enlace para continuar.
            </p>
            <Link
              href="/auth/recover"
              className="inline-flex mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
