import { z } from "zod";
import { normalizeTokens } from "./tokens";

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

const tokenArraySchema = z.preprocess(
  (input) => normalizeTokens(input as string | string[] | null | undefined),
  z.array(z.string())
);

const generatedContentBaseSchema = z.object({
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
    serviceAreas: tokenArraySchema.default([])
  })
});

export const generatedContentSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const raw = input as Record<string, unknown>;
  return {
    ...raw,
    aboutText: raw.aboutText !== undefined ? raw.aboutText : raw.about
  };
}, generatedContentBaseSchema);

const businessProfileBaseSchema = z.object({
  id: z.string().optional(),
  bbbUrl: z.string().url().optional(),
  mode: extractionModeSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  typesOfBusiness: tokenArraySchema.default([]),
  productsAndServices: tokenArraySchema.default([]),
  description: z.string().default(""),
  about: z.string().default(""),
  contact: contactSchema,
  hours: z.record(z.string()).default({}),
  serviceAreas: tokenArraySchema.default([]),
  images: z.array(imageAssetSchema).default([]),
  logoUrl: z.string().url().optional(),
  faqs: z.array(faqSchema).default([]),
  quickAnswers: z.array(faqSchema).default([]),
  testimonials: z.array(testimonialSchema).default([]),
  privacyTrackerOptIn: z.boolean().default(false),
  privacyNotes: z.string().default("")
});

export const businessProfileSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const raw = input as Record<string, unknown>;
  return {
    ...raw,
    typesOfBusiness:
      raw.typesOfBusiness !== undefined ? raw.typesOfBusiness : raw.categories,
    productsAndServices:
      raw.productsAndServices !== undefined ? raw.productsAndServices : raw.services
  };
}, businessProfileBaseSchema);

export const siteDefinitionSchema = z.object({
  profile: businessProfileSchema,
  theme: themeSchema,
  layout: layoutSchema,
  sections: z.array(sectionSchema),
  content: generatedContentSchema,
  substantiationNotes: z.record(z.string()).default({})
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

export const siteStatusSchema = z.enum(["draft", "published", "archived"]);
export const siteTierSchema = z.enum(["free", "premium", "pro"]);

export const siteSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  businessName: z.string().min(1),
  status: siteStatusSchema.default("draft"),
  tier: siteTierSchema.default("free"),
  siteDefinitionJson: siteDefinitionSchema,
  complianceJson: complianceSummarySchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
  createdBy: z.string().optional()
});

export const siteIndexItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  businessName: z.string(),
  status: siteStatusSchema,
  tier: siteTierSchema,
  updatedAt: z.string(),
  publishedAt: z.string().optional()
});

export const adminSiteQuerySchema = z.object({
  search: z.string().optional(),
  status: siteStatusSchema.optional(),
  tier: siteTierSchema.optional()
});

export const createSiteSchema = z.object({
  slug: z.string().min(1),
  businessName: z.string().min(1),
  tier: siteTierSchema.default("free"),
  siteDefinitionJson: siteDefinitionSchema,
  complianceJson: complianceSummarySchema.optional(),
  createdBy: z.string().optional()
});

export const updateSiteSchema = z.object({
  slug: z.string().min(1).optional(),
  businessName: z.string().min(1).optional(),
  tier: siteTierSchema.optional(),
  status: siteStatusSchema.optional(),
  siteDefinitionJson: siteDefinitionSchema.optional(),
  complianceJson: complianceSummarySchema.optional(),
  createdBy: z.string().optional()
});

export const publishSiteSchema = z.object({
  slug: z.string().min(1),
  businessName: z.string().min(1),
  tier: siteTierSchema.default("free"),
  siteDefinitionJson: siteDefinitionSchema,
  complianceJson: complianceSummarySchema.optional(),
  createdBy: z.string().optional(),
  force: z.boolean().optional().default(false)
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
export type SiteDefinition = z.infer<typeof siteDefinitionSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type ComplianceIssue = z.infer<typeof complianceIssueSchema>;
export type ComplianceSummary = z.infer<typeof complianceSummarySchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
export type SiteStatus = z.infer<typeof siteStatusSchema>;
export type SiteTier = z.infer<typeof siteTierSchema>;
export type SiteRecord = z.infer<typeof siteSchema>;
export type SiteIndexItem = z.infer<typeof siteIndexItemSchema>;
