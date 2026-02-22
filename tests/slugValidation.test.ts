import { describe, expect, it } from "vitest";
import { validateSiteSlug } from "@/lib/shared";

describe("site slug validation", () => {
  it("rejects reserved words and normalizes valid slugs", () => {
    const reserved = validateSiteSlug("admin");
    expect(reserved.ok).toBe(false);
    expect(reserved.error).toContain("reserved");

    const valid = validateSiteSlug("My New Business");
    expect(valid.ok).toBe(true);
    expect(valid.slug).toBe("my-new-business");
  });
});
