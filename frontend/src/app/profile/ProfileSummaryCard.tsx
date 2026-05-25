import Link from "next/link";

export default function ProfileSummaryCard({
  fullName,
  activeCourseCount,
}: {
  fullName: string;
  activeCourseCount: number;
}) {
  return (
    <aside className="sticky top-32 rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl font-bold shadow-lg border border-red-500/30">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium text-lg leading-tight">{fullName}</p>
          <p className="mt-0.5 text-sm text-neutral-400">Área de alumno</p>
        </div>
      </div>
      <div className="my-5 border-t border-neutral-800" />
      <p className="text-sm leading-relaxed text-neutral-400">
        {activeCourseCount > 0
          ? `Tienes ${activeCourseCount} curso${activeCourseCount === 1 ? "" : "s"} disponible${activeCourseCount === 1 ? "" : "s"} para continuar.`
          : "Todavía no tienes cursos activos. Puedes explorar la academia y empezar cuando quieras."}
      </p>
      <Link
        href="/courses"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-neutral-500"
      >
        Ver cursos
      </Link>
    </aside>
  );
}
