import {
  normalizeGeneratedContent,
  publicSiteUrl,
  runComplianceChecks,
  toComplianceProfile,
  validateSiteSlug,
  type ComplianceSummary,
  type SiteDefinition
} from "@/lib/shared";

export function siteCompliance(siteDefinition: SiteDefinition): ComplianceSummary {
  const content = normalizeGeneratedContent(siteDefinition.profile, siteDefinition.content);
  return runComplianceChecks(toComplianceProfile(siteDefinition.profile, content));
}

export function hasHighRiskCompliance(summary: ComplianceSummary): boolean {
  return summary.issues.some((issue) => issue.severity === "high");
}

export function validatePublishSlug(slug: string): { ok: boolean; slug: string; error?: string } {
  return validateSiteSlug(slug);
}

export function liveUrlForSlug(slug: string): string {
  return publicSiteUrl(slug);
}
