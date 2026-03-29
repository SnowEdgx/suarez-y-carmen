"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-neutral-950/90 backdrop-blur-md shadow-lg py-4" : "bg-gradient-to-b from-black/80 to-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white drop-shadow-md font-serif">
          S&C
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/courses" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Cursos</Link>
          <Link href="/#methodology" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Metodología</Link>
          <Link href="/#about" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Sobre Nosotros</Link>
          <Link href="/#pricing" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Precios</Link>
        </nav>

        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white hover:text-neutral-300 transition-colors drop-shadow-md">
                Iniciar sesión
              </Link>
              <Link href="/#pricing" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full shadow-lg transition-all hover:scale-105">
                Únete Ahora
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-neutral-900 border-t border-neutral-800 p-6 flex flex-col gap-4 shadow-2xl">
          <Link href="/courses" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>Cursos</Link>
          <Link href="/#methodology" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>Metodología</Link>
          <Link href="/#about" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>Sobre Nosotros</Link>
          <Link href="/#pricing" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>Precios</Link>
          <hr className="border-neutral-800 my-2" />
          {user ? (
            <>
              <Link href="/profile" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>Mi Perfil</Link>
              <button 
                className="mt-2 text-center py-3 bg-red-600 text-white font-semibold rounded-full w-full" 
                onClick={async () => {
                  const { createClient } = await import("@/lib/supabase/client");
                  await createClient().auth.signOut();
                  window.location.reload();
                }}
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white font-medium" onClick={() => setIsMobileMenuOpen(false)}>Iniciar sesión</Link>
              <Link href="/#pricing" className="mt-2 text-center py-3 bg-red-600 text-white font-semibold rounded-full" onClick={() => setIsMobileMenuOpen(false)}>Únete Ahora</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
