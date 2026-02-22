import { createSlug } from "./compliance";

export const RESERVED_SITE_SLUGS = new Set([
  "admin",
  "api",
  "site",
  "assets",
  "favicon",
  "robots.txt",
  "sitemap.xml"
]);

export function normalizeSiteSlug(input: string): string {
  return createSlug(input).toLowerCase();
}

export function validateSiteSlug(rawSlug: string): { ok: boolean; slug: string; error?: string } {
  const slug = normalizeSiteSlug(rawSlug);
  if (!slug) {
    return { ok: false, slug, error: "Slug is required." };
  }
  if (RESERVED_SITE_SLUGS.has(slug)) {
    return { ok: false, slug, error: "This slug is reserved and cannot be used." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      ok: false,
      slug,
      error: "Use lowercase letters, numbers, and dashes only."
    };
  }
  return { ok: true, slug };
}

export function publicSiteUrl(slug: string): string {
  const normalized = normalizeSiteSlug(slug);
  const custom = process.env.NEXT_PUBLIC_PUBLIC_SITE_BASE_URL?.trim();
  if (custom) {
    return `${custom.replace(/\/$/, "")}/${normalized}`;
  }
  const fallback =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  const protocol = fallback.includes("localhost") ? "http" : "https";
  return `${protocol}://${fallback}/site/${normalized}`;
}
