"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, CreditCard, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  user: {
    email?: string;
    user_metadata?: {
      name?: string;
      avatar_url?: string;
    };
  } | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const name = user.user_metadata?.name || user.email?.split("@")[0] || "Usuario";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-neutral-300 transition-colors focus:outline-none"
      >
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold shadow-lg border border-red-500/50">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium hidden lg:block">{name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 hidden lg:block ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden divide-y divide-neutral-800">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{user.email}</p>
          </div>
          <div className="py-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <User size={16} /> Mi Perfil
            </Link>
            <Link
              href="/profile#payments"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <CreditCard size={16} /> Métodos de Pago
            </Link>
          </div>
          <div className="py-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-neutral-800 transition-colors text-left"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
