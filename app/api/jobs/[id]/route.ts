import { NextResponse } from "next/server";
import { getJob } from "@/lib/server/jobs";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const job = getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json({ job });
}
