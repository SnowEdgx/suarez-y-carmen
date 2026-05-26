import { normalizeDisplayText } from "@/lib/display-text";
import type { CourseDetailResource, CourseResourceAccessState } from "./course-detail.model";

type CourseResourcesPanelProps = {
  resources: CourseDetailResource[];
  accessByResourceId: Record<string, CourseResourceAccessState>;
  hasPurchased: boolean;
};

function getResourceLabel(resource: CourseDetailResource) {
  if (resource.file_name) return normalizeDisplayText(resource.file_name, "Material del curso");
  if (resource.mime_type?.includes("pdf")) return "PDF";
  return "Material del curso";
}

export default function CourseResourcesPanel({
  resources,
  accessByResourceId,
  hasPurchased,
}: CourseResourcesPanelProps) {
  if (resources.length === 0 && hasPurchased) return null;

  return (
    <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Materiales</h2>

      {resources.length === 0 ? (
        <p className="text-sm leading-relaxed text-neutral-400">
          Los materiales del curso aparecerán aquí cuando el acceso esté desbloqueado.
        </p>
      ) : (
        <ul className="space-y-3">
          {resources.map((resource) => {
            const access = accessByResourceId[resource.id] || { url: null, errorMessage: null };
            const title = normalizeDisplayText(resource.title, "Material del curso");
            const description = normalizeDisplayText(resource.description);

            return (
              <li key={resource.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    {description && (
                      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{description}</p>
                    )}
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">
                      {resource.is_free_preview ? "Vista previa" : getResourceLabel(resource)}
                    </p>
                  </div>

                  {access.url ? (
                    <span className="shrink-0 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-200">
                      Disponible
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-500">
                      Bloqueado
                    </span>
                  )}
                </div>

                {access.url && (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                      <iframe
                        src={access.url}
                        title={`Material del curso: ${title}`}
                        className="w-full aspect-[1/1.4] bg-neutral-950"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-end">
                      <a
                        href={access.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-white"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                        Abrir a pantalla completa
                      </a>
                    </div>
                  </div>
                )}

                {access.errorMessage && (
                  <p className="mt-3 text-xs leading-relaxed text-neutral-500">{access.errorMessage}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
