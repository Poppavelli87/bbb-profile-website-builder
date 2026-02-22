import type {
  BusinessProfile,
  GeneratedContent,
  ProjectLayout,
  ProjectRecord,
  ProjectSection,
  ProjectTheme,
  SiteDefinition,
  SiteIndexItem,
  SiteRecord,
  SiteStatus,
  SiteTier
} from "@/lib/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export function getApiBase(): string {
  return API_BASE || "";
}

export type ProjectUpdatePayload = {
  profile?: BusinessProfile;
  theme?: ProjectTheme;
  layout?: ProjectLayout;
  sections?: ProjectSection[];
  content?: GeneratedContent;
  substantiationNotes?: Record<string, string>;
  status?: "draft" | "generating" | "generated" | "edited" | "saved" | "error";
};

export type AdminSitePayload = {
  slug: string;
  businessName: string;
  tier?: SiteTier;
  siteDefinitionJson: SiteDefinition;
  complianceJson?: Record<string, unknown>;
  createdBy?: string;
};

export async function extractFromUrl(url: string): Promise<{ ok: boolean; data?: BusinessProfile; fallbackSuggestions?: string[]; error?: string }> {
  const response = await fetch(`${API_BASE}/api/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; data?: BusinessProfile; fallbackSuggestions?: string[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.error || `Request failed (${response.status}).`,
      fallbackSuggestions: payload?.fallbackSuggestions || []
    };
  }

  return payload || { ok: false, error: "Unexpected extraction response." };
}

export async function extractFromHtml(html: string, sourceUrl: string): Promise<{ ok: boolean; data: BusinessProfile }> {
  return apiRequest("/api/extract-html", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ html, sourceUrl })
  });
}

export async function createProject(profile: BusinessProfile): Promise<{ project: ProjectRecord }> {
  return apiRequest("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile })
  });
}

export async function getProject(projectId: string): Promise<{ project: ProjectRecord }> {
  return apiRequest(`/api/projects/${projectId}`);
}

export async function updateProjectProfile(
  projectId: string,
  profile: BusinessProfile
): Promise<{ project: ProjectRecord }> {
  return updateProject(projectId, { profile });
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdatePayload
): Promise<{ project: ProjectRecord }> {
  return apiRequest(`/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function uploadProjectImage(
  projectId: string,
  file: File
): Promise<{ project: ProjectRecord }> {
  const form = new FormData();
  form.append("file", file);

  return apiRequest(`/api/projects/${projectId}/images`, {
    method: "POST",
    body: form
  });
}

export async function startGeneration(projectId: string): Promise<{ jobId: string }> {
  return apiRequest(`/api/projects/${projectId}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ includeLlmsTxt: true, includeHumansTxt: true })
  });
}

export async function getJobStatus(jobId: string): Promise<{
  job: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    result?: {
      previewUrl?: string;
      zipPath?: string;
    };
    error?: string;
  };
}> {
  return apiRequest(`/api/jobs/${jobId}`);
}

export async function renderProject(
  projectId: string,
  status?: "draft" | "generated" | "edited" | "saved"
): Promise<{ project: ProjectRecord; previewUrl: string }> {
  return apiRequest(`/api/projects/${projectId}/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ includeLlmsTxt: true, includeHumansTxt: true, status })
  });
}

export async function resetProject(projectId?: string): Promise<{ ok: boolean }> {
  return apiRequest("/api/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId })
  });
}

export async function listAdminSites(query?: {
  search?: string;
  status?: SiteStatus;
  tier?: SiteTier;
}): Promise<{ sites: SiteIndexItem[] }> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.tier) params.set("tier", query.tier);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/admin/sites${suffix}`);
}

export async function createAdminSite(payload: AdminSitePayload): Promise<{ site: SiteRecord; liveUrl: string }> {
  return apiRequest("/api/admin/sites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getAdminSite(siteId: string): Promise<{ site: SiteRecord; liveUrl: string }> {
  return apiRequest(`/api/admin/sites/${siteId}`);
}

export async function updateAdminSite(
  siteId: string,
  payload: Partial<AdminSitePayload> & { status?: SiteStatus }
): Promise<{ site: SiteRecord; liveUrl: string }> {
  return apiRequest(`/api/admin/sites/${siteId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function publishAdminSite(
  siteId: string,
  payload: AdminSitePayload & { force?: boolean }
): Promise<{ site: SiteRecord; liveUrl: string; compliance: Record<string, unknown> }> {
  return apiRequest(`/api/admin/sites/${siteId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function unpublishAdminSite(siteId: string): Promise<{ site: SiteRecord; liveUrl: string }> {
  return apiRequest(`/api/admin/sites/${siteId}/unpublish`, {
    method: "POST"
  });
}

export async function archiveAdminSite(siteId: string): Promise<{ site: SiteRecord; liveUrl: string }> {
  return apiRequest(`/api/admin/sites/${siteId}/archive`, {
    method: "POST"
  });
}
