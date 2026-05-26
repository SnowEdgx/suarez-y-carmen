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

function getEmbeddedResourceUrl(resource: CourseDetailResource, url: string) {
  const fileName = resource.file_name?.toLowerCase() || "";
  const isPdf = resource.mime_type?.includes("pdf") || fileName.endsWith(".pdf");
  if (!isPdf) return url;

  return url.includes("#") ? `${url}&toolbar=0&navpanes=0` : `${url}#toolbar=0&navpanes=0`;
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
                  <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                    <iframe
                      src={getEmbeddedResourceUrl(resource, access.url)}
                      title={`Material del curso: ${title}`}
                      className="h-[420px] w-full bg-neutral-950"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
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
