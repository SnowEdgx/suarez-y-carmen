import { BookOpen, ShieldCheck } from "lucide-react";

export default function ProfileSummaryCard({
  fullName,
  activeCourseCount,
}: {
  fullName: string;
  activeCourseCount: number;
}) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 backdrop-blur-sm sticky top-32">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl font-bold shadow-lg border border-red-500/30">
          {fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium text-lg leading-tight">{fullName}</p>
          <p className="text-sm text-neutral-400 mt-0.5">
            {activeCourseCount > 0 ? `${activeCourseCount} curso${activeCourseCount === 1 ? "" : "s"} activo${activeCourseCount === 1 ? "" : "s"}` : "Alumno registrado"}
          </p>
        </div>
      </div>
      <hr className="border-neutral-800 my-5" />
      <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 p-4 rounded-2xl mb-4">
        <BookOpen className="text-red-500 shrink-0 mt-0.5" size={20} />
        <p className="text-xs text-neutral-400 leading-relaxed">
          <strong className="text-red-400 font-medium">Cursos activos:</strong> {activeCourseCount}. El acceso se calcula desde tus compras confirmadas.
        </p>
      </div>
      <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/10 p-4 rounded-2xl">
        <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={20} />
        <p className="text-xs text-neutral-400 leading-relaxed">
          <strong className="text-green-500/90 font-medium">Cuenta protegida.</strong> Tus sesiones y permisos se gestionan con controles de acceso seguros.
        </p>
      </div>
    </div>
  );
}
