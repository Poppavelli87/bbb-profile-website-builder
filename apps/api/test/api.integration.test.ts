import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import { buildServer } from "../src/server";

let app: Awaited<ReturnType<typeof buildServer>>;

async function waitForJob(jobId: string): Promise<{ status: string; result?: Record<string, unknown> }> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/api/jobs/${jobId}`
    });

    const payload = response.json() as { job: { status: string; result?: Record<string, unknown> } };
    if (payload.job.status === "completed" || payload.job.status === "failed") {
      return payload.job;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error("Timed out waiting for generation job.");
}

describe("API integration", () => {
  beforeAll(async () => {
    process.env.LOG_LEVEL = "silent";
    app = await buildServer({ mockExtraction: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("handles extraction, project create, generate, download, and publish", async () => {
    const extractResponse = await app.inject({
      method: "POST",
      url: "/api/extract",
      payload: {
        url: "https://www.bbb.org/us/tx/austin/profile/plumber/mock-bbb-business-0000"
      }
    });

    expect(extractResponse.statusCode).toBe(200);
    const extracted = extractResponse.json() as { ok: boolean; data: Record<string, unknown> };
    expect(extracted.ok).toBe(true);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        profile: extracted.data
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { project: { id: string } };
    const projectId = created.project.id;

    const generateResponse = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/generate`,
      payload: {
        includeHumansTxt: true,
        includeLlmsTxt: true
      }
    });

    expect(generateResponse.statusCode).toBe(202);
    const jobId = (generateResponse.json() as { jobId: string }).jobId;

    const job = await waitForJob(jobId);
    expect(job.status).toBe("completed");

    const downloadResponse = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/download`
    });

    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.headers["content-type"]).toContain("application/zip");

    const publishResponse = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      payload: {
        createPr: false
      }
    });

    expect(publishResponse.statusCode).toBe(200);
    const published = publishResponse.json() as { publishedPath: string };
    expect(fs.existsSync(published.publishedPath)).toBe(true);
  });
});
