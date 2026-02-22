import fs from "fs";
import path from "path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  businessProfileSchema,
  createProjectSchema,
  createSlug,
  extractRequestSchema,
  generateProjectSchema,
  projectSchema,
  runComplianceChecks,
  type ProjectRecord
} from "@bbb/shared";
import { extractFromBbbUrl, extractFromProvidedHtml } from "./lib/extractor";
import { zipDirectory } from "./lib/archive";
import { createJob, getJob, updateJob } from "./lib/jobs";
import { generateStaticSite } from "./lib/generator";
import {
  ensureRuntimeDirs,
  generatedRoot,
  generatedSitesRoot,
  uploadsRoot
} from "./lib/paths";
import { getProject, listProjects, saveProject, updateProject } from "./lib/storage";
import { downloadPublicImages, saveUploadedImage } from "./lib/images";
import { publishGeneratedSite } from "./lib/publish";

const htmlExtractionSchema = z.object({
  html: z.string().min(1),
  sourceUrl: z.string().url().default("https://www.bbb.org/profile/")
});

const publishSchema = z.object({
  createPr: z.boolean().default(false)
});

type ServerOptions = {
  mockExtraction?: boolean;
};

export async function buildServer(options: ServerOptions = {}) {
  ensureRuntimeDirs();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info"
    }
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(rateLimit, {
    max: 40,
    timeWindow: "1 minute"
  });

  await app.register(multipart, {
    limits: {
      fileSize: 12 * 1024 * 1024
    }
  });

  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/uploads/",
    decorateReply: false
  });

  await app.register(fastifyStatic, {
    root: generatedRoot,
    prefix: "/generated/",
    decorateReply: false
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    reply.status(500).send({
      error: "Internal server error",
      message
    });
  });

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/projects", async () => {
    const projects = await listProjects();
    return { projects };
  });

  app.post("/api/extract", async (request, reply) => {
    const parsed = extractRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Invalid extract request.",
        details: parsed.error.flatten()
      });
    }

    if (options.mockExtraction) {
      return {
        ok: true,
        data: {
          mode: "auto",
          bbbUrl: parsed.data.url,
          name: "Mock BBB Business",
          slug: "mock-bbb-business",
          categories: ["Home Services"],
          services: ["General repair", "Emergency support"],
          description: "Mock extraction data for e2e testing.",
          about: "Mock extraction data for e2e testing.",
          contact: {
            phone: "(555) 555-5555",
            email: "hello@mockbiz.test",
            website: "https://example.com",
            address: "123 Main St"
          },
          hours: {
            Monday: "9:00 AM - 5:00 PM",
            Tuesday: "9:00 AM - 5:00 PM"
          },
          serviceAreas: ["Metro Area"],
          images: [],
          faqs: [],
          quickAnswers: [],
          testimonials: [],
          privacyTrackerOptIn: false,
          privacyNotes: ""
        }
      };
    }

    const result = await extractFromBbbUrl(parsed.data.url);
    if (!result.ok) {
      return reply.status(400).send(result);
    }

    return result;
  });

  app.post("/api/extract-html", async (request, reply) => {
    const parsed = htmlExtractionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: "Invalid HTML extraction payload.",
        details: parsed.error.flatten()
      });
    }

    const extracted = extractFromProvidedHtml(parsed.data.html, parsed.data.sourceUrl);
    return {
      ok: true,
      data: extracted
    };
  });

  app.post("/api/projects", async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid project payload.",
        details: parsed.error.flatten()
      });
    }

    const now = new Date().toISOString();
    const profile = {
      ...parsed.data.profile,
      slug: createSlug(parsed.data.profile.slug || parsed.data.profile.name)
    };

    const project: ProjectRecord = projectSchema.parse({
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      status: "draft",
      profile
    });

    await saveProject(project);
    return reply.status(201).send({ project });
  });

  app.get("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await getProject(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found." });
    }

    return { project };
  });

  app.put("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = businessProfileSchema.safeParse((request.body as { profile?: unknown })?.profile);

    if (!payload.success) {
      return reply.status(400).send({
        error: "Invalid profile payload.",
        details: payload.error.flatten()
      });
    }

    const updated = await updateProject(id, (project) => ({
      ...project,
      profile: {
        ...payload.data,
        slug: createSlug(payload.data.slug || payload.data.name)
      },
      updatedAt: new Date().toISOString()
    }));

    if (!updated) {
      return reply.status(404).send({ error: "Project not found." });
    }

    return { project: updated };
  });

  app.post("/api/projects/:id/images", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await getProject(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found." });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "No image file provided." });
    }

    const buffer = await file.toBuffer();
    const imageAsset = await saveUploadedImage(id, buffer, file.filename || "Uploaded image");

    const updated = await updateProject(id, (current) => ({
      ...current,
      profile: {
        ...current.profile,
        images: [...current.profile.images, imageAsset]
      },
      updatedAt: new Date().toISOString()
    }));

    return {
      project: updated
    };
  });

  async function runGenerationJob(
    jobId: string,
    projectId: string,
    options: z.infer<typeof generateProjectSchema>
  ): Promise<void> {
    updateJob(jobId, {
      status: "running",
      startedAt: new Date().toISOString()
    });

    try {
      await updateProject(projectId, (project) => ({
        ...project,
        status: "generating",
        updatedAt: new Date().toISOString(),
        lastError: undefined
      }));

      const project = await getProject(projectId);
      if (!project) {
        throw new Error("Project missing during generation.");
      }

      const hydratedImages = await downloadPublicImages(projectId, project.profile.images);
      project.profile.images = hydratedImages;

      const compliance = runComplianceChecks(project.profile);
      const generated = await generateStaticSite(project, compliance, options);
      const zipPath = path.join(generatedRoot, project.id, `${generated.slug}.zip`);

      await zipDirectory(generated.siteDir, zipPath);

      const finalized: ProjectRecord = {
        ...project,
        status: "generated",
        compliance,
        generationPath: generated.siteDir,
        zipPath,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveProject(finalized);

      updateJob(jobId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        result: {
          generationPath: generated.siteDir,
          zipPath,
          previewUrl: `/generated/${project.id}/${generated.slug}/index.html`
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error.";

      await updateProject(projectId, (project) => ({
        ...project,
        status: "error",
        updatedAt: new Date().toISOString(),
        lastError: message
      }));

      updateJob(jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: message
      });
    }
  }

  app.post("/api/projects/:id/generate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await getProject(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found." });
    }

    const parsed = generateProjectSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid generation payload.",
        details: parsed.error.flatten()
      });
    }

    const job = createJob(id);
    void runGenerationJob(job.id, id, parsed.data);

    return reply.status(202).send({ jobId: job.id });
  });

  app.get("/api/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = getJob(id);
    if (!job) {
      return reply.status(404).send({ error: "Job not found." });
    }
    return { job };
  });

  app.get("/api/projects/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await getProject(id);
    if (!project?.zipPath) {
      return reply.status(404).send({ error: "Generated zip is not available for this project." });
    }

    if (!fs.existsSync(project.zipPath)) {
      return reply.status(404).send({ error: "Zip file missing on disk." });
    }

    reply.header("content-type", "application/zip");
    reply.header(
      "content-disposition",
      `attachment; filename=\"${project.profile.slug || project.id}.zip\"`
    );

    return reply.send(fs.createReadStream(project.zipPath));
  });

  app.post("/api/projects/:id/publish", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = publishSchema.safeParse(request.body || {});

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid publish payload.",
        details: parsed.error.flatten()
      });
    }

    const project = await getProject(id);
    if (!project || !project.generationPath) {
      return reply.status(404).send({
        error: "Project has not been generated yet."
      });
    }

    const result = await publishGeneratedSite(project, project.generationPath, parsed.data.createPr);

    return {
      publishedPath: result.destination,
      repoPath: path.relative(process.cwd(), generatedSitesRoot),
      createPrAttempted: result.createPrAttempted,
      prUrl: result.prUrl,
      instructions:
        result.instructions ||
        "Site files copied into generated-sites. Commit and push if you want to publish via GitHub Pages."
    };
  });

  return app;
}
