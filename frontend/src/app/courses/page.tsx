import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import CourseGrid from "@/components/home/CourseGrid";
import { createClient } from "@/lib/supabase/server";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  cover_image_url: string | null;
  price_cents: number | null;
};

type CourseFallbackRow = Omit<CourseRow, "price_cents"> & {
  is_published: boolean;
};

type CoursesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveCheckoutMessage(code: string | null) {
  switch (code) {
    case "already_owned":
      return { type: "info", text: "Ya tienes acceso a este curso. Puedes abrirlo desde el catálogo." };
    case "invalid_course":
      return { type: "error", text: "El curso seleccionado no es válido." };
    case "service_unavailable":
      return { type: "error", text: "No pudimos contactar con el servicio de pago. Inténtalo de nuevo en unos minutos." };
    case "error":
      return { type: "error", text: "No se pudo iniciar el checkout. Vuelve a intentarlo." };
    default:
      return null;
  }
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = searchParams ? await searchParams : {};
  const checkoutParam = Array.isArray(params?.checkout) ? params.checkout[0] : params?.checkout ?? null;
  const checkoutMessage = resolveCheckoutMessage(checkoutParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const coursesResult = await supabase
    .from("courses")
    .select("id, title, slug, description, level, cover_image_url, price_cents, is_published")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  let courses: CourseRow[] = [];

  if (coursesResult.error && coursesResult.error.message.includes("price_cents")) {
    const fallback = await supabase
      .from("courses")
      .select("id, title, slug, description, level, cover_image_url, is_published")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    courses =
      ((fallback.data || []) as CourseFallbackRow[]).map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level,
        cover_image_url: course.cover_image_url,
        price_cents: null,
      })) || [];
  } else {
    courses = (coursesResult.data || []) as CourseRow[];
  }

  let purchasedCourseIds: string[] = [];

  if (user) {
    const purchases = await supabase
      .from("user_courses")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("status", "paid");

    if (!purchases.error) {
      purchasedCourseIds = (purchases.data || []).map((entry: { course_id: string }) => entry.course_id);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar user={user} />
      <main className="pt-24 min-h-[80vh] bg-neutral-950 relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 mb-8 text-center">
          <p className="text-red-500 font-semibold tracking-wider uppercase mb-3">Acceso por curso</p>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">Academia Online</h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Explora el catálogo, visualiza previews públicas y compra solo los cursos que quieras.
          </p>
        </div>

        {checkoutMessage && (
          <div
            className={`max-w-3xl mx-auto mb-8 rounded-xl border px-5 py-4 text-sm ${
              checkoutMessage.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-200"
            }`}
          >
            {checkoutMessage.text}
          </div>
        )}

        <CourseGrid
          courses={courses}
          purchasedCourseIds={purchasedCourseIds}
          isAuthenticated={Boolean(user)}
        />
      </main>
      <Footer />
    </div>
  );
}
