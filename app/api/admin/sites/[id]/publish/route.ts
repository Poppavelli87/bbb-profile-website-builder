import { NextResponse } from "next/server";
import { publishSiteSchema } from "@/lib/shared";
import { getSiteById, publishSite } from "@/lib/server/db/sites";
import {
  hasHighRiskCompliance,
  liveUrlForSlug,
  siteCompliance,
  validatePublishSlug
} from "@/lib/server/site-service";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const existing = await getSiteById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publishSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid publish payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const slugValidation = validatePublishSlug(parsed.data.slug);
  if (!slugValidation.ok) {
    return NextResponse.json({ error: slugValidation.error || "Invalid slug." }, { status: 400 });
  }

  const compliance = siteCompliance(parsed.data.siteDefinitionJson);
  if (hasHighRiskCompliance(compliance) && !parsed.data.force) {
    return NextResponse.json(
      {
        error: "High-risk compliance warnings require confirmation before publishing.",
        requiresConfirmation: true,
        compliance
      },
      { status: 409 }
    );
  }

  try {
    const published = await publishSite(params.id, {
      slug: slugValidation.slug,
      businessName: parsed.data.businessName,
      tier: parsed.data.tier,
      siteDefinitionJson: parsed.data.siteDefinitionJson,
      complianceJson: compliance,
      createdBy: parsed.data.createdBy
    });
    if (!published) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    return NextResponse.json({
      site: published,
      liveUrl: liveUrlForSlug(published.slug),
      compliance
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish site." },
      { status: 400 }
    );
  }
}
