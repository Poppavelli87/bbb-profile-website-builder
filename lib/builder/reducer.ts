import {
  DEFAULT_LAYOUT_ID,
  applyLayoutPreset,
  normalizeGeneratedContent,
  normalizeTheme,
  normalizeSections,
  type ButtonStyle
} from "@/lib/shared";
import type {
  BusinessProfile,
  GeneratedContent,
  ProjectLayout,
  ProjectRecord,
  ProjectSection,
  ProjectTheme
} from "@/lib/shared";

export type BuilderStatus = "draft" | "generated" | "edited" | "saved";

export type BuilderPresent = {
  profile: BusinessProfile | null;
  content: GeneratedContent | null;
  theme: ProjectTheme;
  layout: ProjectLayout;
  sections: ProjectSection[];
  substantiationNotes: Record<string, string>;
};

export type BuilderState = {
  present: BuilderPresent;
  past: BuilderPresent[];
  future: BuilderPresent[];
  status: BuilderStatus;
};

export type BuilderAction =
  | { type: "load"; present: BuilderPresent; status?: BuilderStatus }
  | { type: "edit"; present: BuilderPresent }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "markGenerated" }
  | { type: "markSaved" }
  | { type: "reset" };

const HISTORY_LIMIT = 20;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pushHistory(past: BuilderPresent[], present: BuilderPresent): BuilderPresent[] {
  const next = [...past, clone(present)];
  return next.slice(-HISTORY_LIMIT);
}

export function emptyBuilderPresent(): BuilderPresent {
  const layoutApplied = applyLayoutPreset(DEFAULT_LAYOUT_ID);
  return {
    profile: null,
    content: null,
    theme: normalizeTheme(),
    layout: layoutApplied.layout,
    sections: layoutApplied.sections,
    substantiationNotes: {}
  };
}

export function createBuilderPresentFromProfile(profile: BusinessProfile): BuilderPresent {
  const layoutApplied = applyLayoutPreset(DEFAULT_LAYOUT_ID);
  return {
    profile,
    content: normalizeGeneratedContent(profile),
    theme: normalizeTheme(),
    layout: layoutApplied.layout,
    sections: layoutApplied.sections,
    substantiationNotes: {}
  };
}

export function createBuilderPresentFromProject(project: ProjectRecord): BuilderPresent {
  const profile = project.profile;
  const theme = normalizeTheme(project.theme);
  const buttonStyle = theme.buttonStyle;
  const normalizedTheme: ProjectTheme = {
    presetId: theme.presetId,
    overrides: theme.overrides || {},
    buttonStyle: buttonStyle as ButtonStyle
  };
  const layout = project.layout || { presetId: DEFAULT_LAYOUT_ID };
  return {
    profile,
    content: normalizeGeneratedContent(profile, project.content),
    theme: normalizedTheme,
    layout,
    sections: normalizeSections(layout, project.sections),
    substantiationNotes: project.substantiationNotes || {}
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "load":
      return {
        present: clone(action.present),
        past: [],
        future: [],
        status: action.status || "draft"
      };
    case "edit":
      return {
        present: clone(action.present),
        past: pushHistory(state.past, state.present),
        future: [],
        status: state.status === "generated" || state.status === "saved" || state.status === "edited" ? "edited" : "draft"
      };
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        present: clone(previous),
        past: state.past.slice(0, -1),
        future: [clone(state.present), ...state.future].slice(0, HISTORY_LIMIT),
        status: state.status === "saved" ? "edited" : state.status
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        present: clone(next),
        past: pushHistory(state.past, state.present),
        future: state.future.slice(1),
        status: state.status === "saved" ? "edited" : state.status
      };
    }
    case "markGenerated":
      return {
        ...state,
        status: "generated"
      };
    case "markSaved":
      return {
        ...state,
        status: "saved"
      };
    case "reset":
      return {
        present: emptyBuilderPresent(),
        past: [],
        future: [],
        status: "draft"
      };
    default:
      return state;
  }
}

export function initialBuilderState(): BuilderState {
  return {
    present: emptyBuilderPresent(),
    past: [],
    future: [],
    status: "draft"
  };
}
