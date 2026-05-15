import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-black pt-16 pb-8 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-2">
          <Link href="/" className="text-3xl font-bold font-serif text-white tracking-tight mb-4 inline-block">
            S&C
          </Link>
          <p className="text-neutral-400 max-w-sm">
            Formación profesional de bachata online para estudiar a tu ritmo con acceso por curso.
          </p>
          <div className="mt-8">
            <a
              href="https://www.instagram.com/suarezycarmenoficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 w-fit text-neutral-400 hover:text-white transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center group-hover:bg-neutral-800 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6">Plataforma</h4>
          <ul className="space-y-4 text-sm text-neutral-400">
            <li>
              <Link href="/courses" className="hover:text-white transition-colors">
                Cursos
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white transition-colors">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6">Soporte</h4>
          <ul className="space-y-4 text-sm text-neutral-400">
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contacto
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Política de privacidad
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-neutral-900 text-center text-xs text-neutral-600">
        <p>&copy; {new Date().getFullYear()} Suárez y Carmen. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
