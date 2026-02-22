import { chromium } from "playwright";
import robotsParser from "robots-parser";
import { extractResponseSchema, type BusinessProfile } from "@bbb/shared";
import { parseBbbHtml } from "./parser";

const EXTRACTION_UA = "BBBProfileWebsiteBuilderBot/1.0 (+https://local.builder)";

const fallbackSuggestions = [
  "Switch to Upload HTML mode and provide a saved BBB profile HTML file.",
  "Use Manual Entry mode with screenshots and typed business details.",
  "Verify URL is a public BBB business profile and not behind auth restrictions."
];

function isBbbBusinessProfileUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();

    if (!host.endsWith("bbb.org")) {
      return { valid: false, error: "Only bbb.org profile URLs are allowed for auto-inspection." };
    }

    const path = url.pathname.toLowerCase();
    if (!path.includes("/profile/")) {
      return {
        valid: false,
        error: "URL must point to a BBB business profile path (expected '/profile/' segment)."
      };
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
      headers: {
        "user-agent": EXTRACTION_UA
      }
    });

    if (response.status === 404) {
      return true;
    }
    if (!response.ok) {
      return false;
    }

    const robotsText = await response.text();
    const robots = robotsParser(robotsUrl, robotsText);
    const allowed = robots.isAllowed(url, EXTRACTION_UA);
    return allowed !== false;
  } catch {
    return false;
  }
}

export async function extractFromBbbUrl(url: string): Promise<
  ReturnType<typeof extractResponseSchema.parse>
> {
  const validation = isBbbBusinessProfileUrl(url);
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
      error: "robots.txt disallows automated fetch for this URL.",
      fallbackSuggestions
    };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: EXTRACTION_UA
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 35000
    });

    if (!response || !response.ok()) {
      return {
        ok: false,
        error: `Unable to load profile (${response?.status() || "unknown"}).`,
        fallbackSuggestions
      };
    }

    await page.waitForTimeout(1200);
    const html = await page.content();

    const data = parseBbbHtml(html, url) as BusinessProfile;
    return {
      ok: true,
      data,
      fallbackSuggestions: []
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Extraction failed: ${error.message}`
          : "Extraction failed with an unknown error.",
      fallbackSuggestions
    };
  } finally {
    await browser?.close();
  }
}

export function extractFromProvidedHtml(html: string, sourceUrl: string): BusinessProfile {
  return {
    ...parseBbbHtml(html, sourceUrl),
    mode: "upload_html"
  };
}
