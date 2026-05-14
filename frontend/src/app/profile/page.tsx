import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_ID_HEADER } from "@/lib/device-session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import VideoDevicesPanel from "./VideoDevicesPanel";
import PurchaseHistory from "./PurchaseHistory";
import ProfileSummaryCard from "./ProfileSummaryCard";
import { loadProfilePageData } from "./profile-data";

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
  } = await loadProfilePageData({
    supabase,
    userId: user.id,
    accessToken: session?.access_token ?? null,
    currentDeviceId,
  });

  const fullName = profile?.full_name || user.user_metadata?.name || "Usuario";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col pt-24">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-10 relative z-10">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Mi perfil</h1>
        <p className="text-neutral-400 mb-10">
          Gestiona tus datos personales, tus compras y el progreso de tus cursos.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6">Información personal</h2>
              <ProfileForm initialName={fullName} email={user.email || ""} />
            </section>

            <VideoDevicesPanel
              devices={videoDevices.devices}
              activeDeviceCount={videoDevices.activeDeviceCount}
              maxActiveDevices={videoDevices.maxActiveDevices}
              loadError={videoDevices.loadError}
            />

            <PurchaseHistory purchases={purchases} />
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
