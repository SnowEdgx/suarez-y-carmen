import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import CourseGrid from "@/components/home/CourseGrid";
import { createClient } from "@/lib/supabase/server";

export default async function CursosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main className="pt-24 min-h-[80vh] bg-neutral-950 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 mb-8 text-center">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">En desarrollo</p>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">Próximos Lanzamientos</h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Estamos preparando un catálogo exclusivo de cursos para ti con precios adaptados a cada especialidad.
          </p>
        </div>
        <CourseGrid />
      </main>
      <Footer />
    </div>
  );
}
