import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import About from "@/components/home/About";
import Pricing from "@/components/home/Pricing";
import InPersonClasses, { type InPersonClassItem } from "@/components/home/InPersonClasses";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import type { HomeHeroContent } from "@/components/home/Hero";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Unknown error";
}

function logHomeContentError(context: string, error: unknown) {
  console.error(`[Home Content] ${context}: ${getErrorMessage(error)}`);
}

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: { user } },
    homeContentResponse,
    inPersonClassesResponse,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("home_content")
      .select("hero_eyebrow, hero_title, hero_subtitle, hero_video_url, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href")
      .eq("id", "home")
      .maybeSingle(),
    supabase
      .from("in_person_classes")
      .select("id, title, city, venue, schedule, description, image_url, map_url, contact_url")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  let homeContent: HomeHeroContent | null = null;
  if (homeContentResponse.error) {
    logHomeContentError("Could not load home content", homeContentResponse.error);
  } else {
    homeContent = homeContentResponse.data as HomeHeroContent | null;
  }

  let inPersonClasses: InPersonClassItem[] = [];
  if (inPersonClassesResponse.error) {
    logHomeContentError("Could not load in-person classes", inPersonClassesResponse.error);
  } else {
    inPersonClasses = (inPersonClassesResponse.data || []) as InPersonClassItem[];
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <Hero content={homeContent} />
      <main id="main-content" className="relative z-10 bg-neutral-950">
        <Features />
        <About />
        <InPersonClasses classes={inPersonClasses} />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
