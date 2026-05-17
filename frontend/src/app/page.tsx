import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import About from "@/components/home/About";
import Footer from "@/components/home/Footer";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";
import type { HomeHeroContent } from "@/components/home/Hero";

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: { user } },
    homeContentResponse,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("home_content")
      .select("hero_eyebrow, hero_title, hero_subtitle, hero_video_url, primary_cta_label, primary_cta_href")
      .eq("id", "home")
      .maybeSingle(),
  ]);

  let homeContent: HomeHeroContent | null = null;
  if (homeContentResponse.error) {
    logAppError("Home Content", "Could not load home content", homeContentResponse.error);
  } else {
    homeContent = homeContentResponse.data as HomeHeroContent | null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <Hero content={homeContent} />
      <main id="main-content" className="relative z-10 bg-neutral-950">
        <About />
      </main>
      <Footer />
    </div>
  );
}
