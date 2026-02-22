import {
  DEFAULT_LAYOUT_ID,
  normalizeGeneratedContent,
  normalizeSections,
  normalizeTheme,
  type ProjectRecord
} from "@/lib/shared";

export function hydrateProject(project: ProjectRecord): ProjectRecord {
  const layout = project.layout || { presetId: DEFAULT_LAYOUT_ID };
  return {
    ...project,
    theme: normalizeTheme(project.theme),
    layout,
    sections: normalizeSections(layout, project.sections),
    content: normalizeGeneratedContent(project.profile, project.content),
    substantiationNotes: project.substantiationNotes || {}
  };
}
