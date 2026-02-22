import type { BusinessProfile, ProjectRecord } from "@bbb/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

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
  return API_BASE;
}

export async function extractFromUrl(url: string): Promise<{ ok: boolean; data?: BusinessProfile; fallbackSuggestions?: string[]; error?: string }> {
  return apiRequest("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url })
  });
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
  return apiRequest(`/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile })
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

export async function publishProject(
  projectId: string,
  createPr: boolean
): Promise<{
  publishedPath: string;
  createPrAttempted: boolean;
  prUrl?: string;
  instructions?: string;
}> {
  return apiRequest(`/api/projects/${projectId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ createPr })
  });
}
