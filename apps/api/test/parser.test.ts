import { describe, expect, it } from "vitest";
import { parseBbbHtml } from "../src/lib/parser";

const html = `
<!doctype html>
<html>
  <head>
    <title>Acme Roofing</title>
    <meta name="description" content="Trusted roofing and gutter services." />
    <meta property="og:image" content="https://images.example.com/roof.jpg" />
  </head>
  <body>
    <main>
      <h1>Acme Roofing LLC</h1>
      <a href="tel:+1-222-555-1234">Call us</a>
      <a href="mailto:hello@acmeroofing.test">Email</a>
      <address>555 Roof Lane, Austin, TX</address>

      <section>
        <h2>Services</h2>
        <ul>
          <li>Residential Roof Repair</li>
          <li>Gutter Installation</li>
        </ul>
      </section>

      <section>
        <h2>Service Areas</h2>
        <p>Austin, Round Rock, Cedar Park</p>
      </section>

      <table>
        <tr><th>Monday</th><td>8:00 AM - 6:00 PM</td></tr>
        <tr><th>Tuesday</th><td>8:00 AM - 6:00 PM</td></tr>
      </table>

      <img src="/images/crew.jpg" alt="Our roofing crew" />
    </main>
  </body>
</html>
`;

describe("parseBbbHtml", () => {
  it("extracts normalized profile fields", () => {
    const parsed = parseBbbHtml(html, "https://www.bbb.org/us/tx/austin/profile/roofing/acme-roofing-1234");

    expect(parsed.name).toBe("Acme Roofing LLC");
    expect(parsed.description).toContain("Trusted roofing");
    expect(parsed.contact.phone).toContain("222-555-1234");
    expect(parsed.services).toContain("Residential Roof Repair");
    expect(parsed.serviceAreas.join(" ")).toContain("Austin");
    expect(parsed.images.length).toBeGreaterThan(0);
    expect(parsed.slug).toBe("acme-roofing-llc");
  });
});
