import { v4 as uuidv4 } from "uuid";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type JobRecord = {
  id: string;
  projectId: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
};

const jobs = new Map<string, JobRecord>();

export function createJob(projectId: string): JobRecord {
  const job: JobRecord = {
    id: uuidv4(),
    projectId,
    status: "queued",
    createdAt: new Date().toISOString()
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): JobRecord | null {
  return jobs.get(jobId) || null;
}

export function updateJob(jobId: string, patch: Partial<JobRecord>): JobRecord | null {
  const existing = jobs.get(jobId);
  if (!existing) {
    return null;
  }
  const next = {
    ...existing,
    ...patch
  };
  jobs.set(jobId, next);
  return next;
}
