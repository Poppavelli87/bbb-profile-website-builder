import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  applyLayoutPreset,
  normalizeGeneratedContent,
  normalizeTheme,
  runComplianceChecks,
  toComplianceProfile,
  type ProjectRecord
} from "@/lib/shared";
import { createEmptyProfile } from "@/lib/profile";
import { generateStaticSite } from "@/lib/server/generator";
import { generatedRoot } from "@/lib/server/paths";

describe("generator edits", () => {
  it("renders edited content in generated html output", async () => {
    const profile = createEmptyProfile("Edited Headline Co");
    profile.slug = "edited-headline-co";
    profile.services = ["Roof repair"];
    profile.description = "Original description";

    const layout = applyLayoutPreset("local-service-classic");
    const content = normalizeGeneratedContent(profile, {
      ...normalizeGeneratedContent(profile),
      heroHeadline: "Edited hero headline from builder"
    });
    const compliance = runComplianceChecks(toComplianceProfile(profile, content));

    const project: ProjectRecord = {
      id: "test-generator-edits",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      profile,
      theme: normalizeTheme(),
      layout: layout.layout,
      sections: layout.sections,
      content,
      substantiationNotes: {}
    };

    const result = await generateStaticSite(project, compliance, {
      includeLlmsTxt: true,
      includeHumansTxt: true
    });
    const indexHtml = await fs.readFile(path.join(result.siteDir, "index.html"), "utf8");

    expect(indexHtml).toContain("Edited hero headline from builder");

    await fs.rm(path.join(generatedRoot, project.id), { recursive: true, force: true });
  });
});
