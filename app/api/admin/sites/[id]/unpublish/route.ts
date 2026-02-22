import { NextResponse } from "next/server";
import { liveUrlForSlug } from "@/lib/server/site-service";
import { unpublishSite } from "@/lib/server/db/sites";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  const updated = await unpublishSite(params.id);
  if (!updated) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  return NextResponse.json({
    site: updated,
    liveUrl: liveUrlForSlug(updated.slug)
  });
}
