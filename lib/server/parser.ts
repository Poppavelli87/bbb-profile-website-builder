import { load } from "cheerio";
import type { BusinessProfile } from "@/lib/shared";
import { createSlug } from "@/lib/shared";

const MAX_TEXT_LENGTH = 240;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function textFromSelectors($: ReturnType<typeof load>, selectors: string[]): string {
  for (const selector of selectors) {
    const value = $(selector).first().text().replace(/\s+/g, " ").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function attrFromSelectors(
  $: ReturnType<typeof load>,
  selectors: string[],
  attrName: string
): string {
  for (const selector of selectors) {
    const value = $(selector).first().attr(attrName)?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function toAbsoluteUrl(baseUrl: string, maybeUrl: string): string | null {
  if (!maybeUrl) {
    return null;
  }
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function collectHours($: ReturnType<typeof load>): Record<string, string> {
  const dayPattern = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i;
  const hours: Record<string, string> = {};

  $("tr").each((_, row) => {
    const cells = $(row)
      .find("th,td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);

    if (cells.length >= 2 && dayPattern.test(cells[0])) {
      hours[cells[0]] = cells[1];
    }
  });

  return hours;
}

function collectServiceAreas($: ReturnType<typeof load>): string[] {
  const areas: string[] = [];

  $("h2,h3,h4,strong").each((_, heading) => {
    const headingText = $(heading).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (headingText.includes("service area") || headingText.includes("areas served")) {
      const sectionText = $(heading)
        .parent()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const split = sectionText
        .split(/,|\||\/|;|\n/g)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && token.length < MAX_TEXT_LENGTH);
      areas.push(...split);
    }
  });

  return uniqueStrings(areas).slice(0, 20);
}

function collectListNearKeyword($: ReturnType<typeof load>, keyword: string): string[] {
  const items: string[] = [];

  $("h1,h2,h3,h4,strong").each((_, heading) => {
    const headingText = $(heading).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (headingText.includes(keyword)) {
      const container = $(heading).parent();
      container
        .find("li")
        .each((__, li) => {
          const text = $(li).text().replace(/\s+/g, " ").trim();
          if (text && text.length <= MAX_TEXT_LENGTH) {
            items.push(text);
          }
        });
    }
  });

  return uniqueStrings(items);
}

function collectCategoryCandidates($: ReturnType<typeof load>): string[] {
  const categories: string[] = [];

  $("[itemprop='category'], .category, a[href*='category'], a[href*='services']").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && text.length <= 80) {
      categories.push(text);
    }
  });

  return uniqueStrings(categories).slice(0, 8);
}

function collectImageCandidates($: ReturnType<typeof load>, baseUrl: string): Array<{ url: string; alt: string }> {
  const images: Array<{ url: string; alt: string }> = [];

  const ogImage = $("meta[property='og:image']").attr("content");
  const resolvedOg = toAbsoluteUrl(baseUrl, ogImage || "");
  if (resolvedOg) {
    images.push({ url: resolvedOg, alt: "Business profile image" });
  }

  $("img").each((_, image) => {
    const src = $(image).attr("src") || $(image).attr("data-src") || "";
    const resolved = toAbsoluteUrl(baseUrl, src);
    if (!resolved) {
      return;
    }
    const alt = ($(image).attr("alt") || "Business image").trim();
    images.push({ url: resolved, alt: alt || "Business image" });
  });

  const unique = new Map<string, { url: string; alt: string }>();
  images.forEach((img) => {
    if (!unique.has(img.url)) {
      unique.set(img.url, img);
    }
  });

  return [...unique.values()].slice(0, 12);
}

function parseFaqs($: ReturnType<typeof load>): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  $("h2,h3,h4").each((_, heading) => {
    const question = $(heading).text().replace(/\s+/g, " ").trim();
    if (!question.endsWith("?")) {
      return;
    }
    const answer = $(heading)
      .next("p,div")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (answer) {
      faqs.push({ question, answer });
    }
  });
  return faqs.slice(0, 6);
}

export function parseBbbHtml(html: string, sourceUrl: string): BusinessProfile {
  const $ = load(html);

  const name =
    textFromSelectors($, ["h1", "[itemprop='name']", "meta[property='og:title']"]) || "Untitled Business";

  const descriptionMeta = $("meta[name='description']").attr("content")?.trim() || "";
  const descriptionBody = textFromSelectors($, [".business-description", "[itemprop='description']", "main p"]);
  const description = descriptionMeta || descriptionBody || "Business details imported from BBB profile.";

  const categories = collectCategoryCandidates($);
  const services = collectListNearKeyword($, "service");

  const phoneHref = attrFromSelectors($, ["a[href^='tel:']"], "href");
  const emailHref = attrFromSelectors($, ["a[href^='mailto:']"], "href");

  const websiteHref =
    attrFromSelectors($, ["a[aria-label*='Website']", "a[href*='http']"], "href") || sourceUrl;

  const address = textFromSelectors($, ["[itemprop='streetAddress']", ".address", "address"]);

  const hours = collectHours($);
  const serviceAreas = collectServiceAreas($);
  const imageCandidates = collectImageCandidates($, sourceUrl);
  const logoUrl = toAbsoluteUrl(
    sourceUrl,
    attrFromSelectors($, ["img[alt*='logo' i]", "meta[property='og:image']"], "src") ||
      $("meta[property='og:image']").attr("content") ||
      ""
  );

  const faqs = parseFaqs($);

  return {
    mode: "auto",
    bbbUrl: sourceUrl,
    name,
    slug: createSlug(name),
    categories,
    services,
    description,
    about: description,
    contact: {
      phone: phoneHref.replace(/^tel:/i, ""),
      email: emailHref.replace(/^mailto:/i, ""),
      website: toAbsoluteUrl(sourceUrl, websiteHref) || "",
      address
    },
    hours,
    serviceAreas,
    images: imageCandidates.map((image, idx) => ({
      id: `img-${idx + 1}`,
      url: image.url,
      source: "extracted",
      alt: image.alt,
      selectedHero: idx === 0
    })),
    logoUrl: logoUrl || undefined,
    faqs,
    quickAnswers: faqs.slice(0, 3),
    testimonials: [],
    privacyTrackerOptIn: false,
    privacyNotes: ""
  };
}
