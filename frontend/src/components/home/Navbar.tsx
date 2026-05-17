"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import HomeSectionLink from "./HomeSectionLink";
import { signOutAction } from "@/app/auth/actions";

interface NavbarProps {
  user?: User | null;
}

export default function Navbar({ user = null }: NavbarProps) {
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
        isScrolled
          ? "bg-neutral-950/90 backdrop-blur-md shadow-lg py-4"
          : "bg-gradient-to-b from-black/80 to-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white drop-shadow-md font-serif">
          S&C
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label={"Navegaci\u00f3n principal"}>
          <Link href="/courses" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
            Cursos
          </Link>
          <Link href="/classes" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
            Clases
          </Link>
          <Link href="/events" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
            Agenda
          </Link>
          <HomeSectionLink
            sectionId="about"
            className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Sobre nosotros
          </HomeSectionLink>
        </nav>

        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-white hover:text-neutral-300 transition-colors drop-shadow-md"
              >
                {"Iniciar sesi\u00f3n"}
              </Link>
              <Link
                href="/courses"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full shadow-lg transition-all hover:scale-105"
              >
                Ver cursos
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Cerrar men\u00fa" : "Abrir men\u00fa"}
          aria-controls="mobile-navigation"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={28} aria-hidden="true" /> : <Menu size={28} aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-navigation"
          className="md:hidden absolute top-full left-0 w-full bg-neutral-900 border-t border-neutral-800 p-6 flex flex-col gap-4 shadow-2xl"
          aria-label={"Navegaci\u00f3n m\u00f3vil"}
        >
          <Link href="/courses" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>
            Cursos
          </Link>
          <Link href="/classes" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>
            Clases
          </Link>
          <Link href="/events" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>
            Agenda
          </Link>
          <HomeSectionLink
            sectionId="about"
            className="text-neutral-200"
            onNavigate={() => setIsMobileMenuOpen(false)}
          >
            Sobre nosotros
          </HomeSectionLink>
          <hr className="border-neutral-800 my-2" />
          {user ? (
            <>
              <Link href="/profile" className="text-neutral-200" onClick={() => setIsMobileMenuOpen(false)}>
                Mi perfil
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="mt-2 text-center py-3 bg-red-600 text-white font-semibold rounded-full w-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {"Cerrar sesi\u00f3n"}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                {"Iniciar sesi\u00f3n"}
              </Link>
              <Link
                href="/courses"
                className="mt-2 text-center py-3 bg-red-600 text-white font-semibold rounded-full"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ver cursos
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
