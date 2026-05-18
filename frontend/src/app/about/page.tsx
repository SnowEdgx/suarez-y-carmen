import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import About from "@/components/home/About";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description:
    "Conoce el proyecto de Su\u00e1rez y Carmen: bachata, formaci\u00f3n online, clases presenciales y agenda profesional.",
};

export default async function AboutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <main id="main-content" className="flex-1">
        <About />
      </main>
      <Footer />
    </div>
  );
}
