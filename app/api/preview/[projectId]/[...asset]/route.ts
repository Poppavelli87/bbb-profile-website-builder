import fs from "fs";
import { NextResponse } from "next/server";
import mime from "mime-types";
import { generatedRoot, safeResolve } from "@/lib/server/paths";

export const runtime = "nodejs";

type Params = {
  params: {
    projectId: string;
    asset: string[];
  };
};

export async function GET(_request: Request, { params }: Params) {
  const target = safeResolve(generatedRoot, params.projectId, ...(params.asset || []));
  if (!target || !fs.existsSync(target)) {
    return NextResponse.json({ error: "Preview asset not found." }, { status: 404 });
  }

  const stat = await fs.promises.stat(target);
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Preview asset not found." }, { status: 404 });
  }

  const bytes = await fs.promises.readFile(target);
  const contentType = mime.lookup(target) || "application/octet-stream";
  return new NextResponse(bytes, {
    headers: {
      "content-type": contentType.toString()
    }
  });
}
