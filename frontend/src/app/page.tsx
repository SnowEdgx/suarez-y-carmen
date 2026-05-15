import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import About from "@/components/home/About";
import Pricing from "@/components/home/Pricing";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <Hero />
      <main id="main-content" className="relative z-10 bg-neutral-950">
        <Features />
        <About />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
