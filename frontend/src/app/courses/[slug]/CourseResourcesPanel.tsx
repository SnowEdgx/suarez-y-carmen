import type { CourseDetailResource, CourseResourceAccessState } from "./course-detail.model";

type CourseResourcesPanelProps = {
  resources: CourseDetailResource[];
  accessByResourceId: Record<string, CourseResourceAccessState>;
  hasPurchased: boolean;
};

function getResourceLabel(resource: CourseDetailResource) {
  if (resource.file_name) return resource.file_name;
  if (resource.mime_type?.includes("pdf")) return "PDF";
  return "Material descargable";
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
          Los materiales descargables aparecer\u00e1n aqu\u00ed cuando el curso est\u00e9 desbloqueado.
        </p>
      ) : (
        <ul className="space-y-3">
          {resources.map((resource) => {
            const access = accessByResourceId[resource.id] || { url: null, errorMessage: null };

            return (
              <li key={resource.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{resource.title}</p>
                    {resource.description && (
                      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{resource.description}</p>
                    )}
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">
                      {resource.is_free_preview ? "Preview" : getResourceLabel(resource)}
                    </p>
                  </div>

                  {access.url ? (
                    <a
                      href={access.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="shrink-0 rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-500">
                      Bloqueado
                    </span>
                  )}
                </div>

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
