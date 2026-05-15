"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User as UserIcon, LogOut, CreditCard, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { signOutAction } from "@/app/auth/actions";

interface UserMenuProps {
  user: User | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const name = user.user_metadata?.name || user.email?.split("@")[0] || "Usuario";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-neutral-300 transition-colors"
        aria-label={isOpen ? "Cerrar menú de usuario" : "Abrir menú de usuario"}
        aria-controls="user-menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold shadow-lg border border-red-500/50">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium hidden lg:block">{name}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 hidden lg:block ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          id="user-menu"
          className="absolute right-0 mt-3 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden divide-y divide-neutral-800"
          role="menu"
        >
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{user.email}</p>
          </div>
          <div className="py-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              role="menuitem"
            >
              <UserIcon size={16} aria-hidden="true" /> Mi perfil
            </Link>
            <Link
              href="/profile#payments"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              role="menuitem"
            >
              <CreditCard size={16} aria-hidden="true" /> Pagos y acceso
            </Link>
          </div>
          <div className="py-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-neutral-800 transition-colors text-left"
                role="menuitem"
              >
                <LogOut size={16} aria-hidden="true" /> Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
