"use client";

import { useState } from "react";
import { normalizeDisplayText } from "@/lib/display-text";
import type { CourseDetailResource, CourseResourceAccessState } from "./course-detail.model";

type CourseResourcesPanelProps = {
  resources: CourseDetailResource[];
  accessByResourceId: Record<string, CourseResourceAccessState>;
};

function getResourceLabel(resource: CourseDetailResource) {
  if (resource.mime_type?.includes("pdf")) return "PDF";
  if (resource.mime_type?.includes("image")) return "Imagen";
  return "Material del curso";
}

export default function CourseResourcesPanel({
  resources,
  accessByResourceId,
}: CourseResourcesPanelProps) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  if (resources.length === 0) return null;

  return (
    <aside className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Materiales</h2>

      <ul className="space-y-3">
        {resources.map((resource) => {
          const access = accessByResourceId[resource.id] || { url: null, errorMessage: null };
          const title = normalizeDisplayText(resource.title, "Material del curso");
          const description = normalizeDisplayText(resource.description);
          const label = resource.is_free_preview ? "Vista previa" : getResourceLabel(resource);
          const isPreviewing = activePreviewId === resource.id;

          return (
            <li key={resource.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  {description && (
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">{description}</p>
                  )}
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">
                    {label}
                  </p>
                </div>

                {!access.url && (
                  <span className="shrink-0 rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-500">
                    Bloqueado
                  </span>
                )}

              </div>

              {access.url && (
                <div className="mt-4 space-y-3">
                  {isPreviewing && (
                    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                      <iframe
                        src={access.url}
                        title={`Material del curso: ${title}`}
                        className="w-full aspect-[1/1.4] bg-neutral-950"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreviewId(isPreviewing ? null : resource.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-white cursor-pointer"
                    >
                      {isPreviewing ? "Ocultar vista previa" : "Ver vista previa"}
                    </button>
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
    </aside>
  );
}
