import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import InPersonClasses, { type InPersonClassItem } from "@/components/home/InPersonClasses";
import Footer from "@/components/home/Footer";
import { logAppError } from "@/lib/error-logging";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clases presenciales",
  description: "Sedes y horarios de clases presenciales de bachata con Su\u00e1rez y Carmen.",
};

export default async function ClassesPage() {
  const supabase = await createClient();
  const [
    { data: { user } },
    classesResponse,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("in_person_classes")
      .select("id, title, city, venue, schedule, image_url, map_url, contact_url")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  let classes: InPersonClassItem[] = [];
  if (classesResponse.error) {
    logAppError("Classes Page", "Could not load in-person classes", classesResponse.error);
  } else {
    classes = (classesResponse.data || []) as InPersonClassItem[];
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main id="main-content" className="pt-28">
        <InPersonClasses classes={classes} />
      </main>
      <Footer />
    </div>
  );
}
