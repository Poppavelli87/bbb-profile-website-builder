import { NextResponse } from "next/server";
import { adminSiteQuerySchema, createSiteSchema } from "@/lib/shared";
import { createSiteDraft, listSiteIndex } from "@/lib/server/db/sites";
import { liveUrlForSlug, siteCompliance } from "@/lib/server/site-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = adminSiteQuerySchema.safeParse({
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
    tier: url.searchParams.get("tier") || undefined
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const sites = await listSiteIndex(parsed.data);
  return NextResponse.json({ sites });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid site payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const compliance = parsed.data.complianceJson || siteCompliance(parsed.data.siteDefinitionJson);
    const site = await createSiteDraft({
      ...parsed.data,
      complianceJson: compliance
    });
    return NextResponse.json(
      {
        site,
        liveUrl: liveUrlForSlug(site.slug)
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create site." },
      { status: 400 }
    );
  }
}
