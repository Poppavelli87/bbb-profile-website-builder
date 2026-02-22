import fs from "fs";
import { NextResponse } from "next/server";
import mime from "mime-types";
import { safeResolve, uploadsRoot } from "@/lib/server/paths";

export const runtime = "nodejs";

type Params = {
  params: {
    projectId: string;
    file: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const target = safeResolve(uploadsRoot, params.projectId, params.file);
  if (!target || !fs.existsSync(target)) {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }

  const bytes = await fs.promises.readFile(target);
  const contentType = mime.lookup(target) || "application/octet-stream";
  return new NextResponse(bytes, {
    headers: {
      "content-type": contentType.toString(),
      "cache-control": "private, max-age=600"
    }
  });
}
