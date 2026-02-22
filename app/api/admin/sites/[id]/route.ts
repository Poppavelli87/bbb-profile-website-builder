import { NextResponse } from "next/server";
import { updateSiteSchema } from "@/lib/shared";
import { getSiteById, updateSite } from "@/lib/server/db/sites";
import { liveUrlForSlug, siteCompliance } from "@/lib/server/site-service";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const site = await getSiteById(params.id);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  return NextResponse.json({ site, liveUrl: liveUrlForSlug(site.slug) });
}

export async function PUT(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const parsed = updateSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid site update payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const compliance =
      parsed.data.complianceJson ||
      (parsed.data.siteDefinitionJson ? siteCompliance(parsed.data.siteDefinitionJson) : undefined);
    const updated = await updateSite(params.id, {
      ...parsed.data,
      complianceJson: compliance || parsed.data.complianceJson
    });
    if (!updated) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    return NextResponse.json({
      site: updated,
      liveUrl: liveUrlForSlug(updated.slug)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update site." },
      { status: 400 }
    );
  }
}
