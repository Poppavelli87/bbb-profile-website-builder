import robotsParser from "robots-parser";
import type { BusinessProfile } from "@/lib/shared";
import { extractResponseSchema } from "@/lib/shared";
import { parseBbbHtml } from "./parser";

const EXTRACTION_UA = "Mozilla/5.0 (compatible; BBBProfileWebsiteBuilder/1.0)";

const fallbackSuggestions = [
  "Upload a saved HTML file using Upload HTML mode.",
  "Use Manual Entry mode and type services/contact details directly.",
  "Confirm the URL is a public BBB business profile and accessible without login."
];

function validateBbbProfileUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith("bbb.org")) {
      return { valid: false, error: "Only bbb.org URLs are supported for auto extraction." };
    }
    if (!url.pathname.toLowerCase().includes("/profile/")) {
      return { valid: false, error: "Expected a BBB business profile URL containing '/profile/'." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL provided." };
  }
}

async function robotsAllows(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: { "user-agent": EXTRACTION_UA },
      redirect: "follow"
    });
    if (response.status === 404) {
      return true;
    }
    if (!response.ok) {
      return false;
    }
    const rules = await response.text();
    const parsedRobots = robotsParser(robotsUrl, rules);
    return parsedRobots.isAllowed(url, EXTRACTION_UA) !== false;
  } catch {
    return false;
  }
}

export async function extractFromBbbUrl(
  url: string
): Promise<ReturnType<typeof extractResponseSchema.parse>> {
  const validation = validateBbbProfileUrl(url);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
      fallbackSuggestions
    };
  }

  const allowed = await robotsAllows(url);
  if (!allowed) {
    return {
      ok: false,
      error: "Auto extraction is blocked by robots.txt for this page.",
      fallbackSuggestions
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": EXTRACTION_UA,
        accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `URL request failed with status ${response.status}.`,
        fallbackSuggestions
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return {
        ok: false,
        error: "The response was not HTML, so parsing could not continue.",
        fallbackSuggestions
      };
    }

    const html = await response.text();
    const parsed = parseBbbHtml(html, url);
    return {
      ok: true,
      data: parsed,
      fallbackSuggestions: []
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Auto extraction failed.",
      fallbackSuggestions
    };
  }
}

export function extractFromProvidedHtml(html: string, sourceUrl: string): BusinessProfile {
  return {
    ...parseBbbHtml(html, sourceUrl),
    mode: "upload_html"
  };
}
