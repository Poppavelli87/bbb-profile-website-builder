import { describe, expect, it } from "vitest";
import PublicSitePage from "@/app/site/[slug]/page";

describe("public minisite renderer", () => {
  it("returns not found for missing slug", async () => {
    const slug = `missing-${Date.now()}`;
    await expect(PublicSitePage({ params: { slug } })).rejects.toMatchObject({
      digest: "NEXT_NOT_FOUND"
    });
  });
});
