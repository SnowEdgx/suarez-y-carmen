import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import DeleteAccountConfirmClient from "./DeleteAccountConfirmClient";

export const metadata: Metadata = {
  title: "Confirmar borrado de cuenta | Suárez y Carmen",
  description: "Confirmación de la eliminación definitiva de tu cuenta de alumno.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DeleteAccountConfirmPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar />

      <main id="main-content" className="relative z-10 flex-1 flex items-center justify-center px-6 pb-20 pt-32 md:px-12">
        {/* Background ambient glow matching login page */}
        <div 
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_18%,rgba(220,38,38,0.18),transparent_34%),linear-gradient(180deg,rgba(10,10,10,0.2),#0a0a0a)]" 
          aria-hidden="true"
        />

        <Suspense fallback={<div className="text-neutral-400 animate-pulse">Cargando confirmación...</div>}>
          <DeleteAccountConfirmClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
