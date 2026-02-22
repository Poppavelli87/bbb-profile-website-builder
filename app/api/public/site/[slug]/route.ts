import { NextResponse } from "next/server";
import { getSiteBySlug } from "@/lib/server/db/sites";
import { liveUrlForSlug } from "@/lib/server/site-service";

export const runtime = "nodejs";

type Params = {
  params: {
    slug: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const site = await getSiteBySlug(params.slug);
  if (!site || site.status !== "published") {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  return NextResponse.json({
    site,
    liveUrl: liveUrlForSlug(site.slug)
  });
}
