import { z } from "zod";

export const extractionModeSchema = z.enum(["auto", "upload_html", "manual"]);

export const contactSchema = z.object({
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  website: z.string().optional().default(""),
  address: z.string().optional().default("")
});

export const imageAssetSchema = z.object({
  id: z.string(),
  url: z.string().min(1),
  source: z.enum(["extracted", "uploaded"]),
  alt: z.string().optional().default(""),
  selectedHero: z.boolean().optional().default(false)
});

export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1)
});

export const testimonialSchema = z.object({
  author: z.string().min(1),
  quote: z.string().min(1),
  disclosure: z.string().optional().default("")
});

export const sectionIdSchema = z.enum([
  "hero",
  "quick_answers",
  "services",
  "about",
  "service_areas",
  "faq",
  "hours",
  "contact",
  "gallery"
]);

export const themeVarsSchema = z.object({
  bg: z.string().min(1),
  surface: z.string().min(1),
  text: z.string().min(1),
  muted: z.string().min(1),
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  border: z.string().min(1)
});

export const themeSchema = z.object({
  presetId: z.string().min(1).default("minimal-light"),
  overrides: themeVarsSchema.partial().optional().default({}),
  buttonStyle: z.enum(["rounded", "pill", "square"]).optional()
});

export const layoutSchema = z.object({
  presetId: z.string().min(1).default("local-service-classic")
});

export const sectionSchema = z.object({
  id: sectionIdSchema,
  enabled: z.boolean().default(true)
});

export const generatedServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().default("")
});

export const generatedContentSchema = z.object({
  siteTitle: z.string().min(1),
  metaDescription: z.string().default(""),
  heroHeadline: z.string().default(""),
  heroSubheadline: z.string().default(""),
  heroCtaText: z.string().default(""),
  aboutText: z.string().default(""),
  services: z.array(generatedServiceSchema).default([]),
  faqs: z.array(faqSchema).default([]),
  quickAnswers: z.array(faqSchema).default([]),
  contact: contactSchema.extend({
    hours: z.record(z.string()).default({}),
    serviceAreas: z.array(z.string()).default([])
  })
});

export const businessProfileSchema = z.object({
  id: z.string().optional(),
  bbbUrl: z.string().url().optional(),
  mode: extractionModeSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  categories: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  description: z.string().default(""),
  about: z.string().default(""),
  contact: contactSchema,
  hours: z.record(z.string()).default({}),
  serviceAreas: z.array(z.string()).default([]),
  images: z.array(imageAssetSchema).default([]),
  logoUrl: z.string().url().optional(),
  faqs: z.array(faqSchema).default([]),
  quickAnswers: z.array(faqSchema).default([]),
  testimonials: z.array(testimonialSchema).default([]),
  privacyTrackerOptIn: z.boolean().default(false),
  privacyNotes: z.string().default("")
});

export const complianceIssueSchema = z.object({
  id: z.string(),
  field: z.string(),
  phrase: z.string(),
  type: z.enum([
    "superlative",
    "comparative_savings",
    "lifetime_guarantee",
    "testimonial_atypical"
  ]),
  severity: z.enum(["low", "medium", "high"]),
  whyRisky: z.string(),
  requiredSubstantiation: z.string(),
  saferRewrite: z.string()
});

export const complianceSummarySchema = z.object({
  reviewedAt: z.string(),
  issues: z.array(complianceIssueSchema),
  requiresUserReview: z.boolean()
});

export const projectSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  generatedAt: z.string().optional(),
  status: z.enum(["draft", "generating", "generated", "edited", "saved", "error"]).default("draft"),
  profile: businessProfileSchema,
  theme: themeSchema.default({ presetId: "minimal-light", overrides: {} }),
  layout: layoutSchema.default({ presetId: "local-service-classic" }),
  sections: z.array(sectionSchema).default([]),
  content: generatedContentSchema.optional(),
  substantiationNotes: z.record(z.string()).default({}),
  compliance: complianceSummarySchema.optional(),
  generationPath: z.string().optional(),
  zipPath: z.string().optional(),
  lastError: z.string().optional()
});

export const extractRequestSchema = z.object({
  url: z.string().url()
});

export const extractResponseSchema = z.object({
  ok: z.boolean(),
  data: businessProfileSchema.optional(),
  error: z.string().optional(),
  fallbackSuggestions: z.array(z.string()).default([])
});

export const createProjectSchema = z.object({
  profile: businessProfileSchema
});

export const updateProjectSchema = z.object({
  profile: businessProfileSchema.optional(),
  theme: themeSchema.optional(),
  layout: layoutSchema.optional(),
  sections: z.array(sectionSchema).optional(),
  content: generatedContentSchema.optional(),
  substantiationNotes: z.record(z.string()).optional(),
  status: z.enum(["draft", "generating", "generated", "edited", "saved", "error"]).optional()
});

export const generateProjectSchema = z.object({
  includeLlmsTxt: z.boolean().default(true),
  includeHumansTxt: z.boolean().default(true)
});

export type ExtractionMode = z.infer<typeof extractionModeSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type FAQ = z.infer<typeof faqSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type SectionId = z.infer<typeof sectionIdSchema>;
export type ThemeVars = z.infer<typeof themeVarsSchema>;
export type ProjectTheme = z.infer<typeof themeSchema>;
export type ProjectLayout = z.infer<typeof layoutSchema>;
export type ProjectSection = z.infer<typeof sectionSchema>;
export type GeneratedService = z.infer<typeof generatedServiceSchema>;
export type GeneratedContent = z.infer<typeof generatedContentSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type ComplianceIssue = z.infer<typeof complianceIssueSchema>;
export type ComplianceSummary = z.infer<typeof complianceSummarySchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
