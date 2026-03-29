import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import { CreditCard, ShieldCheck } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch full profile from the custom DB table using the verified Auth UUID
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name || user.user_metadata?.name || "Usuario";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col pt-24">
      <Navbar user={user} />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-10 relative z-10">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Mi Perfil</h1>
        <p className="text-neutral-400 mb-10">Gestiona tu información personal y métodos de pago de forma segura.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-6">Información Personal</h2>
              <ProfileForm initialName={fullName} email={user.email || ""} />
            </section>

            <section id="payments" className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <CreditCard className="text-[#635BFF]" />
                  Pagos y Seguridad
                </h2>
                <span className="text-xs bg-[#635BFF]/10 text-[#635BFF] px-3 py-1.5 rounded-full font-medium w-fit border border-[#635BFF]/20">Stripe PCI-DSS</span>
              </div>
              <p className="text-neutral-400 text-sm mb-6 max-w-xl">
                La seguridad es nuestra prioridad. Tus transacciones se gestionan a través de la infraestructura de <span className="text-white font-medium">Stripe™</span>, asegurando que tus datos estén siempre encriptados y protegidos. Nosotros nunca almacenamos tu información financiera.
              </p>
              <div className="border border-neutral-700/50 rounded-2xl p-6 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-medium mb-1">Adquisición de Cursos</h3>
                  <p className="text-neutral-500 text-xs">Al comprar un curso, serás dirigido directamente a la pasarela de pago oficial de Stripe.</p>
                </div>
                <button disabled className="px-5 py-2.5 bg-neutral-800 text-neutral-400 rounded-lg text-sm font-medium transition-colors cursor-not-allowed whitespace-nowrap">
                  Sistema Vinculado
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 backdrop-blur-sm sticky top-32">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl font-bold shadow-lg border border-red-500/30">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-lg leading-tight">{fullName}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">Alumno Premium</p>
                </div>
              </div>
              <hr className="border-neutral-800 my-5" />
              <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/10 p-4 rounded-2xl">
                <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  <strong className="text-green-500/90 font-medium">Cuenta protegida.</strong> Todo tu progreso e información de facturación está firmemente encriptada y segura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
