import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import { POST as createSite } from "@/app/api/admin/sites/route";
import { POST as publishSiteRoute } from "@/app/api/admin/sites/[id]/publish/route";
import { createEmptyProfile } from "@/lib/profile";
import {
  applyLayoutPreset,
  normalizeGeneratedContent,
  normalizeTheme,
  type SiteRecord
} from "@/lib/shared";
import { siteStorageDir } from "@/lib/server/paths";
import { getSiteById } from "@/lib/server/db/sites";

describe("publish flow", () => {
  it("persists published status and returns live URL", async () => {
    const unique = `test-${Date.now()}`;
    const profile = createEmptyProfile(`Business ${unique}`);
    profile.slug = unique;
    profile.description = "Local service provider";

    const layout = applyLayoutPreset("local-service-classic");
    const content = normalizeGeneratedContent(profile);

    const createRequest = new Request("http://localhost/api/admin/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: profile.slug,
        businessName: profile.name,
        tier: "premium",
        siteDefinitionJson: {
          profile,
          theme: normalizeTheme(),
          layout: layout.layout,
          sections: layout.sections,
          content,
          substantiationNotes: {}
        }
      })
    });
    const createResponse = await createSite(createRequest);
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { site: SiteRecord };

    const publishRequest = new Request(
      `http://localhost/api/admin/sites/${created.site.id}/publish`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: profile.slug,
          businessName: profile.name,
          tier: "premium",
          siteDefinitionJson: created.site.siteDefinitionJson,
          force: true
        })
      }
    );
    const publishResponse = await publishSiteRoute(publishRequest, {
      params: { id: created.site.id }
    });
    expect(publishResponse.status).toBe(200);
    const published = (await publishResponse.json()) as { site: SiteRecord; liveUrl: string };
    expect(published.site.status).toBe("published");
    expect(published.liveUrl.toLowerCase()).toContain(profile.slug.toLowerCase());

    const persisted = await getSiteById(created.site.id);
    expect(persisted?.status).toBe("published");

    await fs.rm(path.join(siteStorageDir, `${created.site.id}.json`), { force: true });
  });
});
