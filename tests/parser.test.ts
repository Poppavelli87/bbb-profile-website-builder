import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseBbbHtml } from "@/lib/server/parser";

describe("parseBbbHtml", () => {
  it("maps Business Categories, Products and Services, and Service Areas to the correct fields only", () => {
    const fixturePath = path.join(process.cwd(), "tests", "fixtures", "bbb-profile.html");
    const html = fs.readFileSync(fixturePath, "utf8");
    const parsed = parseBbbHtml(
      html,
      "https://www.bbb.org/us/tx/austin/profile/roofing/sample-roofing-co-0000"
    );

    expect(parsed.name).toBe("Sample Roofing Co");
    expect(parsed.typesOfBusiness).toEqual(["Roofing Contractors", "Gutters and Downspouts"]);
    expect(parsed.productsAndServices).toEqual(["Roof replacement", "Gutter installation"]);
    expect(parsed.productsAndServices).not.toContain("Should not be imported");
    expect(parsed.serviceAreas.join(" ")).toContain("Austin");
    expect(parsed.contact.phone).toContain("555-111-2222");
    expect(parsed.description).toContain("Trusted roofing and gutter services");
  });

  it("leaves missing sections blank instead of backfilling", () => {
    const html = `
      <html>
        <body>
          <h1>Missing Fields Co</h1>
          <section>
            <h2>Business Categories</h2>
            <ul><li>General Contractors</li></ul>
          </section>
        </body>
      </html>
    `;

    const parsed = parseBbbHtml(html, "https://www.bbb.org/us/tx/austin/profile/contractor/missing-fields-0000");
    expect(parsed.typesOfBusiness).toEqual(["General Contractors"]);
    expect(parsed.productsAndServices).toEqual([]);
    expect(parsed.serviceAreas).toEqual([]);
  });
});
