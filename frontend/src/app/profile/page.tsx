import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_ID_HEADER } from "@/lib/device-session";
import { normalizeDisplayText } from "@/lib/display-text";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import VideoDevicesPanel from "./VideoDevicesPanel";
import PurchaseHistory from "./PurchaseHistory";
import ProfileSummaryCard from "./ProfileSummaryCard";
import { loadProfilePageData } from "./profile-data";

export const metadata: Metadata = {
  title: "Mi perfil",
  description: "Área privada para consultar perfil, cursos comprados y progreso.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const requestHeaders = await headers();
  const currentDeviceId = requestHeaders.get(DEVICE_ID_HEADER);
  const {
    profile,
    purchases,
    activeCourseCount,
    videoDevices,
    alerts,
  } = await loadProfilePageData({
    supabase,
    userId: user.id,
    accessToken: session?.access_token ?? null,
    currentDeviceId,
  });

  const fullName = normalizeDisplayText(profile?.full_name || user.user_metadata?.name, "Usuario");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col pt-24">
      <Navbar user={user} />

      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-10 relative z-10">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Mi perfil</h1>
        <p className="text-neutral-400 mb-10">
          Consulta tus cursos y actualiza los datos básicos de tu cuenta.
        </p>

        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.text}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300"
              >
                {alert.text}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PurchaseHistory purchases={purchases} />

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-sm sm:p-8">
              <h2 className="mb-6 text-xl font-semibold text-white">Datos personales</h2>
              <ProfileForm initialName={fullName} email={user.email || ""} />
            </section>

            <VideoDevicesPanel
              devices={videoDevices.devices}
              activeDeviceCount={videoDevices.activeDeviceCount}
              maxActiveDevices={videoDevices.maxActiveDevices}
              loadError={videoDevices.loadError}
            />
          </div>

          <div className="space-y-6">
            <ProfileSummaryCard fullName={fullName} activeCourseCount={activeCourseCount} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
