import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseBbbHtml } from "@/lib/server/parser";

describe("parseBbbHtml", () => {
  it("extracts normalized profile data from html fixture", () => {
    const fixturePath = path.join(process.cwd(), "tests", "fixtures", "bbb-profile.html");
    const html = fs.readFileSync(fixturePath, "utf8");
    const parsed = parseBbbHtml(
      html,
      "https://www.bbb.org/us/tx/austin/profile/roofing/sample-roofing-co-0000"
    );

    expect(parsed.name).toBe("Sample Roofing Co");
    expect(parsed.services).toContain("Roof replacement");
    expect(parsed.serviceAreas.join(" ")).toContain("Austin");
    expect(parsed.contact.phone).toContain("555-111-2222");
    expect(parsed.description).toContain("Trusted roofing and gutter services");
  });
});
