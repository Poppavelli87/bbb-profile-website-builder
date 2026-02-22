import { load, type Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { BusinessProfile } from "@/lib/shared";
import { createSlug } from "@/lib/shared";

const MAX_TEXT_LENGTH = 240;

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  values.forEach((item) => {
    const token = item.trim().replace(/\s+/g, " ");
    if (!token) {
      return;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(token);
  });
  return deduped;
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

function normalizeSectionLabel(value: string): string {
  return value.toLowerCase().replace(/[:\s]+/g, " ").trim();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSectionTokens(raw: string): string[] {
  return raw
    .split(/[\n,;|/]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && token.length <= MAX_TEXT_LENGTH);
}

function stripSectionLabels(text: string, labels: string[]): string {
  return labels.reduce((next, label) => {
    const escaped = escapeRegExp(label);
    return next
      .replace(new RegExp(`^${escaped}\\s*:?[\\s-]*`, "i"), "")
      .replace(new RegExp(`\\b${escaped}\\b\\s*:?[\\s-]*`, "gi"), " ");
  }, text);
}

function collectTokensFromNodes(
  $: ReturnType<typeof load>,
  nodes: Cheerio<AnyNode>,
  labels: string[]
): string[] {
  const tokens: string[] = [];
  nodes.each((_, node) => {
    const current = $(node);
    current.find("li").each((__, li) => {
      const item = $(li).text().replace(/\s+/g, " ").trim();
      if (item.length > 1 && item.length <= MAX_TEXT_LENGTH) {
        tokens.push(item);
      }
    });

    current.find("a").each((__, anchor) => {
      const item = $(anchor).text().replace(/\s+/g, " ").trim();
      if (item.length > 1 && item.length <= MAX_TEXT_LENGTH) {
        tokens.push(item);
      }
    });

    const stripped = current.clone();
    stripped.find("ul,ol,li,a,script,style").remove();
    const text = stripped.text().replace(/\s+/g, " ").trim();
    if (text) {
      tokens.push(...splitSectionTokens(stripSectionLabels(text, labels)));
    }
  });
  return uniqueStrings(tokens);
}

function collectSectionValues($: ReturnType<typeof load>, labels: string[]): string[] {
  const expected = new Set(labels.map((label) => normalizeSectionLabel(label)));
  const collected: string[] = [];

  $("h1,h2,h3,h4,h5,h6,strong,b,dt,p,span").each((_, element) => {
    const labelText = $(element).text().replace(/\s+/g, " ").trim();
    if (!labelText || !expected.has(normalizeSectionLabel(labelText))) {
      return;
    }

    const tagName = (element as { tagName?: string }).tagName?.toLowerCase() || "";
    if (tagName === "dt") {
      const definitionValues = $(element).nextUntil("dt", "dd");
      if (definitionValues.length > 0) {
        collected.push(...collectTokensFromNodes($, definitionValues, labels));
        return;
      }
    }

    if (/^h[1-6]$/.test(tagName)) {
      const sectionNodes = $(element).nextUntil("h1,h2,h3,h4,h5,h6");
      if (sectionNodes.length > 0) {
        collected.push(...collectTokensFromNodes($, sectionNodes, labels));
        return;
      }
    }

    const scoped = $(element).closest("section,article,dd,div,p,li");
    if (scoped.length > 0) {
      collected.push(...collectTokensFromNodes($, scoped.first(), labels));
      return;
    }

    collected.push(...collectTokensFromNodes($, $(element), labels));
  });

  return uniqueStrings(collected)
    .filter((token) => !expected.has(normalizeSectionLabel(token)))
    .slice(0, 20);
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

  const typesOfBusiness = collectSectionValues($, ["Business Categories"]);
  const productsAndServices = collectSectionValues($, ["Products and Services"]);

  const phoneHref = attrFromSelectors($, ["a[href^='tel:']"], "href");
  const emailHref = attrFromSelectors($, ["a[href^='mailto:']"], "href");

  const websiteHref =
    attrFromSelectors($, ["a[aria-label*='Website']", "a[href*='http']"], "href") || sourceUrl;

  const address = textFromSelectors($, ["[itemprop='streetAddress']", ".address", "address"]);

  const hours = collectHours($);
  const serviceAreas = collectSectionValues($, ["Service Area", "Service Areas"]);
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
    typesOfBusiness,
    productsAndServices,
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
