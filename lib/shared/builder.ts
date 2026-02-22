import type {
  BusinessProfile,
  GeneratedContent,
  ProjectLayout,
  ProjectSection,
  ProjectTheme,
  SectionId,
  ThemeVars
} from "./schemas";

export type ButtonStyle = "rounded" | "pill" | "square";

export type ThemePreset = {
  id: string;
  label: string;
  vars: ThemeVars;
  buttonStyle: ButtonStyle;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "minimal-light",
    label: "Minimal Light",
    vars: {
      bg: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#475569",
      primary: "#1d4ed8",
      secondary: "#0f766e",
      accent: "#2563eb",
      border: "#dbe2ea"
    },
    buttonStyle: "rounded"
  },
  {
    id: "minimal-dark",
    label: "Minimal Dark",
    vars: {
      bg: "#0b1220",
      surface: "#111827",
      text: "#e5e7eb",
      muted: "#94a3b8",
      primary: "#38bdf8",
      secondary: "#22d3ee",
      accent: "#0ea5e9",
      border: "#1f2937"
    },
    buttonStyle: "rounded"
  },
  {
    id: "modern-neutral",
    label: "Modern Neutral",
    vars: {
      bg: "#f6f5f2",
      surface: "#ffffff",
      text: "#1f2937",
      muted: "#6b7280",
      primary: "#334155",
      secondary: "#64748b",
      accent: "#0f766e",
      border: "#d1d5db"
    },
    buttonStyle: "rounded"
  },
  {
    id: "bold-contrast",
    label: "Bold Contrast",
    vars: {
      bg: "#0f172a",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#334155",
      primary: "#ef4444",
      secondary: "#0ea5e9",
      accent: "#f59e0b",
      border: "#0f172a"
    },
    buttonStyle: "square"
  },
  {
    id: "coastal",
    label: "Coastal",
    vars: {
      bg: "#f0f9ff",
      surface: "#ffffff",
      text: "#0c4a6e",
      muted: "#0369a1",
      primary: "#0891b2",
      secondary: "#14b8a6",
      accent: "#06b6d4",
      border: "#bae6fd"
    },
    buttonStyle: "pill"
  },
  {
    id: "earthy",
    label: "Earthy",
    vars: {
      bg: "#faf7f2",
      surface: "#fffdf9",
      text: "#3f2d20",
      muted: "#6e5847",
      primary: "#8b5e34",
      secondary: "#4d7c0f",
      accent: "#b45309",
      border: "#e5d5c5"
    },
    buttonStyle: "rounded"
  },
  {
    id: "classic-blue",
    label: "Classic Blue",
    vars: {
      bg: "#eef4ff",
      surface: "#ffffff",
      text: "#0b3b8c",
      muted: "#1d4ed8",
      primary: "#1e40af",
      secondary: "#0f766e",
      accent: "#2563eb",
      border: "#bfdbfe"
    },
    buttonStyle: "rounded"
  },
  {
    id: "warm-sunset",
    label: "Warm Sunset",
    vars: {
      bg: "#fff7ed",
      surface: "#ffffff",
      text: "#7c2d12",
      muted: "#9a3412",
      primary: "#ea580c",
      secondary: "#f59e0b",
      accent: "#f97316",
      border: "#fed7aa"
    },
    buttonStyle: "pill"
  },
  {
    id: "clean-green",
    label: "Clean Green",
    vars: {
      bg: "#f0fdf4",
      surface: "#ffffff",
      text: "#14532d",
      muted: "#166534",
      primary: "#16a34a",
      secondary: "#0d9488",
      accent: "#22c55e",
      border: "#bbf7d0"
    },
    buttonStyle: "rounded"
  },
  {
    id: "slate-pro",
    label: "Slate Pro",
    vars: {
      bg: "#f1f5f9",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#475569",
      primary: "#1e293b",
      secondary: "#334155",
      accent: "#0f766e",
      border: "#cbd5e1"
    },
    buttonStyle: "square"
  }
];

export const ALL_SECTION_IDS: SectionId[] = [
  "hero",
  "quick_answers",
  "services",
  "about",
  "service_areas",
  "faq",
  "hours",
  "contact",
  "gallery"
];

export type LayoutPreset = {
  id: string;
  label: string;
  sections: SectionId[];
};

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "local-service-classic",
    label: "Local Service Classic",
    sections: ["hero", "quick_answers", "services", "service_areas", "about", "faq", "hours", "contact", "gallery"]
  },
  {
    id: "product-retail",
    label: "Product and Retail",
    sections: ["hero", "services", "about", "gallery", "faq", "contact"]
  },
  {
    id: "high-trust",
    label: "High Trust",
    sections: ["hero", "about", "services", "quick_answers", "faq", "hours", "service_areas", "contact", "gallery"]
  },
  {
    id: "minimal-one-page",
    label: "Minimal One Page",
    sections: ["hero", "about", "services", "contact"]
  },
  {
    id: "story-first",
    label: "Story First",
    sections: ["hero", "about", "quick_answers", "services", "gallery", "faq", "service_areas", "contact"]
  }
];

export const DEFAULT_THEME_ID = "minimal-light";
export const DEFAULT_LAYOUT_ID = "local-service-classic";

function dedupeSections(ids: SectionId[]): SectionId[] {
  const seen = new Set<SectionId>();
  const ordered: SectionId[] = [];
  ids.forEach((id) => {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  });
  return ordered;
}

export function getThemePreset(presetId?: string): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === presetId) || THEME_PRESETS[0];
}

export function getLayoutPreset(presetId?: string): LayoutPreset {
  return LAYOUT_PRESETS.find((preset) => preset.id === presetId) || LAYOUT_PRESETS[0];
}

export function normalizeTheme(theme?: ProjectTheme): ProjectTheme {
  const preset = getThemePreset(theme?.presetId);
  return {
    presetId: preset.id,
    overrides: theme?.overrides || {},
    buttonStyle: theme?.buttonStyle || preset.buttonStyle
  };
}

export function resolveTheme(theme?: ProjectTheme): { vars: ThemeVars; buttonStyle: ButtonStyle } {
  const normalized = normalizeTheme(theme);
  const preset = getThemePreset(normalized.presetId);
  const vars: ThemeVars = {
    ...preset.vars,
    ...(normalized.overrides || {})
  };
  return {
    vars,
    buttonStyle: normalized.buttonStyle || preset.buttonStyle
  };
}

export function themeVarsToCss(vars: ThemeVars): string {
  return [
    `--bg: ${vars.bg};`,
    `--surface: ${vars.surface};`,
    `--text: ${vars.text};`,
    `--muted: ${vars.muted};`,
    `--primary: ${vars.primary};`,
    `--secondary: ${vars.secondary};`,
    `--accent: ${vars.accent};`,
    `--border: ${vars.border};`
  ].join("\n");
}

export function buildSectionsFromLayoutPreset(presetId?: string): ProjectSection[] {
  const preset = getLayoutPreset(presetId);
  const enabled = new Set<SectionId>(preset.sections);
  const ordered = dedupeSections([...preset.sections, ...ALL_SECTION_IDS]);
  return ordered.map((id) => ({
    id,
    enabled: enabled.has(id)
  }));
}

export function normalizeSections(
  layout: ProjectLayout | undefined,
  sections: ProjectSection[] | undefined
): ProjectSection[] {
  const defaults = buildSectionsFromLayoutPreset(layout?.presetId);
  if (!sections || sections.length === 0) {
    return defaults;
  }

  const defaultEnabled = new Map(defaults.map((section) => [section.id, section.enabled]));
  const enabledById = new Map(
    sections
      .filter((section) => ALL_SECTION_IDS.includes(section.id))
      .map((section) => [section.id, section.enabled] as const)
  );

  const incomingOrder = sections
    .map((section) => section.id)
    .filter((id): id is SectionId => ALL_SECTION_IDS.includes(id));
  const ordered = dedupeSections([...incomingOrder, ...ALL_SECTION_IDS]);
  return ordered.map((id) => ({
    id,
    enabled: enabledById.get(id) ?? defaultEnabled.get(id) ?? true
  }));
}

function serviceDescription(name: string): string {
  return `Professional ${name.toLowerCase()} tailored to your needs.`;
}

export function createGeneratedContentFromProfile(profile: BusinessProfile): GeneratedContent {
  const siteTitle = `${profile.name} | ${profile.typesOfBusiness[0] || "Local Business"}`;
  const metaDescription =
    profile.description || profile.about || "Local business website generated from provided business details.";
  const services = profile.productsAndServices.map((service) => ({
    name: service,
    description: serviceDescription(service)
  }));

  const faqs = profile.faqs.length > 0 ? profile.faqs : [];
  const quickAnswers =
    profile.quickAnswers.length > 0
      ? profile.quickAnswers
      : faqs.slice(0, 3).length > 0
        ? faqs.slice(0, 3)
        : [
            {
              question: "What products and services do you offer?",
              answer:
                services.slice(0, 4).map((service) => service.name).join(", ") ||
                "Contact us for product and service details."
            },
            {
              question: "Which areas do you serve?",
              answer:
                profile.serviceAreas.join(", ") ||
                "Contact us to confirm service coverage for your location."
            }
          ];

  return {
    siteTitle,
    metaDescription,
    heroHeadline: profile.name,
    heroSubheadline: profile.description || "Trusted local service for homes and businesses.",
    heroCtaText: "Request Service",
    aboutText: profile.about || profile.description,
    services,
    faqs,
    quickAnswers,
    contact: {
      phone: profile.contact.phone || "",
      email: profile.contact.email || "",
      website: profile.contact.website || "",
      address: profile.contact.address || "",
      hours: profile.hours || {},
      serviceAreas: profile.serviceAreas || []
    }
  };
}

export function normalizeGeneratedContent(
  profile: BusinessProfile,
  content?: GeneratedContent
): GeneratedContent {
  const defaults = createGeneratedContentFromProfile(profile);
  if (!content) {
    return defaults;
  }

  const mergedServices =
    content.services && content.services.length > 0
      ? content.services.map((service) => ({
          name: service.name || "Service",
          description: service.description || ""
        }))
      : defaults.services;

  return {
    siteTitle: content.siteTitle || defaults.siteTitle,
    metaDescription: content.metaDescription || defaults.metaDescription,
    heroHeadline: content.heroHeadline || defaults.heroHeadline,
    heroSubheadline: content.heroSubheadline || defaults.heroSubheadline,
    heroCtaText: content.heroCtaText || defaults.heroCtaText,
    aboutText: content.aboutText || defaults.aboutText,
    services: mergedServices,
    faqs: content.faqs || defaults.faqs,
    quickAnswers: content.quickAnswers || defaults.quickAnswers,
    contact: {
      ...defaults.contact,
      ...(content.contact || {}),
      hours: content.contact?.hours || defaults.contact.hours,
      serviceAreas: content.contact?.serviceAreas || defaults.contact.serviceAreas
    }
  };
}

export type LayoutSuggestion = {
  recommendedPresetId: string;
  reasons: string[];
  sectionToggles: Partial<Record<SectionId, boolean>>;
};

export function suggestLayout(profile: BusinessProfile, content?: GeneratedContent): LayoutSuggestion {
  const source = content || createGeneratedContentFromProfile(profile);
  const servicesCount = source.services.length;
  const faqCount = source.faqs.length;
  const hasAreas = source.contact.serviceAreas.length > 0;
  const hasHours = Object.keys(source.contact.hours || {}).length > 0;
  const imageCount = profile.images.length;

  const reasons: string[] = [];
  const sectionToggles: Partial<Record<SectionId, boolean>> = {};
  let recommendedPresetId = DEFAULT_LAYOUT_ID;

  if (imageCount < 2) {
    recommendedPresetId = "minimal-one-page";
    reasons.push("Fewer than two images detected, so a compact one-page layout is recommended.");
    sectionToggles.gallery = false;
  }

  if (servicesCount >= 6) {
    reasons.push("Six or more offerings were found, so the Products and Services section should stay prominent.");
    sectionToggles.services = true;
  }

  if (hasAreas) {
    reasons.push("Service areas were detected, enabling a dedicated Service Areas block.");
    sectionToggles.service_areas = true;
  }

  if (faqCount >= 3) {
    recommendedPresetId = imageCount < 2 ? recommendedPresetId : "high-trust";
    reasons.push("Three or more FAQs were found, enabling FAQ and Quick Answers blocks.");
    sectionToggles.faq = true;
    sectionToggles.quick_answers = true;
  }

  if (hasHours) {
    reasons.push("Business hours were found, enabling an Hours block near contact content.");
    sectionToggles.hours = true;
  }

  if (reasons.length === 0) {
    reasons.push("Local Service Classic is a good default for balanced local business content.");
  }

  return {
    recommendedPresetId,
    reasons,
    sectionToggles
  };
}

export function applySectionToggles(
  sections: ProjectSection[],
  toggles: Partial<Record<SectionId, boolean>>
): ProjectSection[] {
  return sections.map((section) => ({
    ...section,
    enabled: toggles[section.id] ?? section.enabled
  }));
}

export function applyLayoutPreset(
  presetId: string,
  sectionToggles?: Partial<Record<SectionId, boolean>>
): { layout: ProjectLayout; sections: ProjectSection[] } {
  let sections = buildSectionsFromLayoutPreset(presetId);
  if (sectionToggles) {
    sections = applySectionToggles(sections, sectionToggles);
  }
  return {
    layout: { presetId: getLayoutPreset(presetId).id },
    sections
  };
}

export function toComplianceProfile(profile: BusinessProfile, content: GeneratedContent): BusinessProfile {
  return {
    ...profile,
    slug: profile.slug || profile.name.toLowerCase().replace(/\s+/g, "-"),
    description: content.metaDescription || content.heroSubheadline,
    about: content.aboutText,
    productsAndServices: content.services.map((service) => service.name),
    faqs: content.faqs,
    quickAnswers: content.quickAnswers,
    contact: {
      ...profile.contact,
      ...content.contact
    },
    hours: content.contact.hours || {},
    serviceAreas: content.contact.serviceAreas || []
  };
}

function channelToLinear(value: number): number {
  const ratio = value / 255;
  if (ratio <= 0.03928) return ratio / 12.92;
  return ((ratio + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (![3, 6].includes(normalized.length)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const num = Number.parseInt(expanded, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) {
    return 21;
  }

  const fgLum = 0.2126 * channelToLinear(fg.r) + 0.7152 * channelToLinear(fg.g) + 0.0722 * channelToLinear(fg.b);
  const bgLum = 0.2126 * channelToLinear(bg.r) + 0.7152 * channelToLinear(bg.g) + 0.0722 * channelToLinear(bg.b);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}
