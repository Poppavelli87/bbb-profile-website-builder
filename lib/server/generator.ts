import fs from "fs/promises";
import path from "path";
import {
  DEFAULT_LAYOUT_ID,
  createSlug,
  normalizeGeneratedContent,
  normalizeSections,
  resolveTheme,
  themeVarsToCss,
  type BusinessProfile,
  type ComplianceSummary,
  type GeneratedContent,
  type ProjectRecord,
  type ProjectSection,
  type SectionId
} from "@/lib/shared";
import { generatedRoot, safeResolve, uploadsRoot } from "./paths";
import { renderFromModelToHTML } from "./render-from-model";

export type GenerationOptions = {
  includeLlmsTxt: boolean;
  includeHumansTxt: boolean;
};

type GeneratedResult = {
  siteDir: string;
  slug: string;
  pages: string[];
};

type LocalImage = {
  src: string;
  alt: string;
  hero: boolean;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(input: string, max: number): string {
  if (input.length <= max) {
    return input;
  }
  return `${input.slice(0, max - 3).trim()}...`;
}

function buttonRadius(buttonStyle: "rounded" | "pill" | "square"): string {
  if (buttonStyle === "pill") return "999px";
  if (buttonStyle === "square") return "2px";
  return "12px";
}

function buildNav(): string {
  const links = [
    ["index.html", "Home"],
    ["services.html", "Products and Services"],
    ["about.html", "About"],
    ["contact.html", "Contact"],
    ["privacy.html", "Privacy"]
  ];

  return links
    .map(([href, label]) => `<a href="${href}" class="nav-link">${escapeHtml(label)}</a>`)
    .join("\n");
}

function schemaForPage(
  profile: BusinessProfile,
  content: GeneratedContent,
  baseUrl: string,
  pageName: string,
  pageFile: string,
  faqs: Array<{ question: string; answer: string }>
): string {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    description: content.metaDescription,
    url: baseUrl,
    telephone: content.contact.phone || undefined,
    email: content.contact.email || undefined,
    address: content.contact.address || undefined,
    areaServed: content.contact.serviceAreas
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: profile.name,
    url: baseUrl
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${baseUrl}/index.html` },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: `${baseUrl}/${pageFile}`
      }
    ]
  };

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer }
          }))
        }
      : null;

  return [localBusiness, website, breadcrumb, faqSchema]
    .filter(Boolean)
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join("\n");
}

function renderLayout(
  profile: BusinessProfile,
  content: GeneratedContent,
  args: {
    title: string;
    description: string;
    body: string;
    pageName: string;
    pageFile: string;
    faqs: Array<{ question: string; answer: string }>;
    ogImage: string;
  }
): string {
  const baseUrl = content.contact.website || profile.contact.website || `https://example.com/${profile.slug}`;
  const canonical = `${baseUrl}/${args.pageFile}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.title)}</title>
  <meta name="description" content="${escapeHtml(truncate(args.description, 160))}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(args.title)}" />
  <meta property="og:description" content="${escapeHtml(truncate(args.description, 200))}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(args.ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="assets/styles.css" />
  ${schemaForPage(profile, content, baseUrl, args.pageName, args.pageFile, args.faqs)}
</head>
<body>
  <a href="#content" class="skip-link">Skip to content</a>
  <header class="site-header">
    <div class="container header-grid">
      <div>
        <p class="eyebrow">Privacy-first local website</p>
        <h1>${escapeHtml(profile.name)}</h1>
      </div>
      <nav aria-label="Primary" class="nav">${buildNav()}</nav>
    </div>
  </header>

  <main id="content" class="container">${args.body}</main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <p>${escapeHtml(profile.name)} ${new Date().getFullYear()}</p>
      <a href="privacy.html">Privacy Policy</a>
    </div>
  </footer>

  <section id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie settings">
    <p>We use essential cookies only by default. Optional analytics stays off until you opt in.</p>
    <div class="cookie-actions">
      <button id="accept-all-cookies" class="button">Accept all cookies</button>
      <button id="manage-cookies" class="button ghost">Manage cookies</button>
    </div>
  </section>
  <dialog id="cookie-dialog" class="cookie-dialog">
    <form method="dialog" class="dialog-body">
      <h2>Cookie Preferences</h2>
      <p>Essential cookies are always enabled. Analytics is optional and disabled by default.</p>
      <label class="toggle-row"><span>Essential cookies</span><input type="checkbox" checked disabled /></label>
      <label class="toggle-row"><span>Analytics cookies</span><input id="analytics-opt-in" type="checkbox" /></label>
      <menu class="dialog-actions"><button id="save-cookie-preferences" value="default" class="button">Save preferences</button></menu>
    </form>
  </dialog>
  <script src="assets/site.js"></script>
</body>
</html>`;
}

async function copyLocalOrRemoteImage(
  projectId: string,
  imageUrl: string,
  destination: string
): Promise<boolean> {
  try {
    if (imageUrl.startsWith(`/api/uploads/${projectId}/`)) {
      const fileName = imageUrl.split("/").pop();
      if (!fileName) return false;
      const source = safeResolve(uploadsRoot, projectId, fileName);
      if (!source) return false;
      await fs.copyFile(source, destination);
      return true;
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = await fetch(imageUrl, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; BBBProfileWebsiteBuilder/1.0)" },
        redirect: "follow"
      });
      if (!response.ok) return false;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) return false;
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(destination, bytes);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function materializeImages(
  project: ProjectRecord,
  profile: BusinessProfile,
  siteDir: string
): Promise<LocalImage[]> {
  const imageDir = path.join(siteDir, "assets", "images");
  await fs.mkdir(imageDir, { recursive: true });

  const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" role="img" aria-label="Placeholder"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#ecfeff"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, sans-serif" font-size="48" fill="#0f172a">Business Photo Placeholder</text></svg>`;
  await fs.writeFile(path.join(imageDir, "placeholder.svg"), placeholder, "utf8");

  const collected: LocalImage[] = [];
  for (let i = 0; i < profile.images.length; i += 1) {
    const image = profile.images[i];
    const inferredExtMatch = image.url.match(/\.(png|jpe?g|gif|webp|svg)(?:$|\?)/i);
    const inferredExt = inferredExtMatch ? inferredExtMatch[1].replace("jpeg", "jpg").toLowerCase() : "jpg";
    const fileName = `photo-${i + 1}.${inferredExt}`;
    const target = path.join(imageDir, fileName);
    const success = await copyLocalOrRemoteImage(project.id, image.url, target);
    if (!success) {
      continue;
    }
    collected.push({
      src: `assets/images/${fileName}`,
      alt: image.alt || `${profile.name} photo ${i + 1}`,
      hero: Boolean(image.selectedHero)
    });
  }

  if (collected.length === 0) {
    collected.push({
      src: "assets/images/placeholder.svg",
      alt: `${profile.name} placeholder image`,
      hero: true
    });
  }
  if (!collected.some((item) => item.hero)) {
    collected[0].hero = true;
  }
  return collected;
}

function renderQuickAnswers(content: GeneratedContent): string {
  const quickAnswers = content.quickAnswers || [];
  if (quickAnswers.length === 0) {
    return "";
  }
  return `<section class="panel quick-answers" aria-labelledby="quick-answers-heading">
  <h2 id="quick-answers-heading">Quick answers</h2>
  <div class="quick-grid">
    ${quickAnswers
      .map((item) => `<article><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`)
      .join("\n")}
  </div>
</section>`;
}

function renderFaqList(faqs: Array<{ question: string; answer: string }>): string {
  if (faqs.length === 0) return "";
  return `<section class="panel" aria-labelledby="faq-heading">
  <h2 id="faq-heading">Frequently asked questions</h2>
  <div class="faq-grid">
    ${faqs
      .map((faq) => `<article class="faq-item"><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></article>`)
      .join("\n")}
  </div>
</section>`;
}

function renderGallery(images: LocalImage[]): string {
  if (images.length === 0) {
    return "";
  }
  return `<section class="panel"><h2>Gallery</h2><div class="card-grid">
    ${images
      .map((image) => `<figure class="card"><img src="${image.src}" alt="${escapeHtml(image.alt)}" class="hero-image" /></figure>`)
      .join("\n")}
  </div></section>`;
}

function hoursTable(hours: Record<string, string>): string {
  const entries = Object.entries(hours || {});
  if (entries.length === 0) {
    return "<p>Hours available on request.</p>";
  }
  return `<table><thead><tr><th scope="col">Day</th><th scope="col">Hours</th></tr></thead><tbody>${entries
    .map(([day, value]) => `<tr><th scope="row">${escapeHtml(day)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("")}</tbody></table>`;
}

function renderContact(content: GeneratedContent): string {
  return `<ul>
    <li><strong>Phone:</strong> ${escapeHtml(content.contact.phone || "Available on request")}</li>
    <li><strong>Email:</strong> ${escapeHtml(content.contact.email || "Available on request")}</li>
    <li><strong>Website:</strong> ${
      content.contact.website
        ? `<a href="${escapeHtml(content.contact.website)}">${escapeHtml(content.contact.website)}</a>`
        : "Available on request"
    }</li>
    <li><strong>Address:</strong> ${escapeHtml(content.contact.address || "Available on request")}</li>
  </ul>`;
}

function sectionMarkup(
  sectionId: SectionId,
  profile: BusinessProfile,
  content: GeneratedContent,
  images: LocalImage[]
): string {
  const hero = images.find((image) => image.hero) || images[0];
  switch (sectionId) {
    case "hero":
      return `<section class="panel hero">
  <article>
    <h2>${escapeHtml(content.heroHeadline || profile.name)}</h2>
    <p>${escapeHtml(content.heroSubheadline || content.metaDescription)}</p>
    <p><a class="button" href="contact.html">${escapeHtml(content.heroCtaText || "Contact Us")}</a></p>
  </article>
  <figure><img src="${hero.src}" alt="${escapeHtml(hero.alt)}" class="hero-image" /></figure>
</section>`;
    case "quick_answers":
      return renderQuickAnswers(content);
    case "services":
      return `<section class="panel"><h2>Products and Services</h2><div class="card-grid">${content.services
        .slice(0, 6)
        .map(
          (service) =>
            `<article class="card"><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.description || "Request a tailored quote for this service.")}</p></article>`
        )
        .join("")}</div></section>`;
    case "about":
      return `<section class="panel"><h2>About ${escapeHtml(profile.name)}</h2><p>${escapeHtml(content.aboutText || content.metaDescription)}</p></section>`;
    case "service_areas":
      return `<section class="panel"><h2>Service Areas</h2><p>${escapeHtml(content.contact.serviceAreas.join(", ") || "Contact us to confirm service coverage.")}</p></section>`;
    case "faq":
      return renderFaqList(content.faqs || []);
    case "hours":
      return `<section class="panel"><h2>Business Hours</h2>${hoursTable(content.contact.hours || {})}</section>`;
    case "contact":
      return `<section class="panel"><h2>Contact</h2>${renderContact(content)}</section>`;
    case "gallery":
      return renderGallery(images.slice(0, 6));
    default:
      return "";
  }
}

function renderHomeBody(
  profile: BusinessProfile,
  content: GeneratedContent,
  sections: ProjectSection[],
  images: LocalImage[]
): string {
  return sections
    .filter((section) => section.enabled)
    .map((section) => sectionMarkup(section.id, profile, content, images))
    .filter(Boolean)
    .join("\n");
}

function styles(themeCss: string, currentButtonRadius: string): string {
  return `:root { color-scheme: light; ${themeCss} --button-radius: ${currentButtonRadius}; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, var(--bg)), var(--bg) 55%); color: var(--text); line-height: 1.55; }
a { color: var(--secondary); text-decoration-thickness: .08em; text-underline-offset: .12em; }
.container { width: min(1080px, 92vw); margin: 0 auto; }
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 1rem; top: 1rem; background: #fff; padding: .5rem .8rem; border: 2px solid var(--primary); }
.site-header { padding: 2.2rem 0 1.3rem; border-bottom: 1px solid var(--border); }
.header-grid { display: flex; gap: 1rem; justify-content: space-between; align-items: end; flex-wrap: wrap; }
.eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .08em; font-size: .76rem; color: var(--muted); }
.nav { display: flex; gap: .9rem; flex-wrap: wrap; }
.nav-link { color: var(--text); text-decoration: none; border-bottom: 2px solid transparent; padding-bottom: .2rem; }
.nav-link:hover, .nav-link:focus { border-bottom-color: var(--primary); }
main { padding: 1.4rem 0 2.5rem; display: grid; gap: 1.1rem; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 1.1rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); }
.hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 1rem; }
.hero-image { width: 100%; height: 100%; min-height: 260px; object-fit: cover; border-radius: 14px; }
.types-of-business h3 { margin-bottom: .5rem; }
.chip-list { display: flex; flex-wrap: wrap; gap: .45rem; }
.chip { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid var(--border); background: color-mix(in srgb, var(--accent) 12%, #fff); padding: .18rem .62rem; font-size: .82rem; font-weight: 600; color: var(--text); }
.quick-grid, .faq-grid, .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .8rem; }
.card, .faq-item { border: 1px solid var(--border); border-radius: 12px; padding: .8rem; background: var(--surface); }
.site-footer { border-top: 1px solid var(--border); padding: 1.3rem 0 2.2rem; }
.footer-grid { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .8rem; }
.button { display: inline-flex; background: var(--primary); color: #fff; border: none; border-radius: var(--button-radius); padding: .55rem 1rem; cursor: pointer; font-weight: 600; text-decoration: none; }
.button:hover { filter: brightness(1.05); }
.button.ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
.cookie-banner { position: fixed; right: 1rem; left: 1rem; bottom: 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: .9rem; box-shadow: 0 20px 35px rgba(15, 23, 42, .12); display: none; gap: .8rem; align-items: center; justify-content: space-between; flex-wrap: wrap; z-index: 40; }
.cookie-banner.visible { display: flex; }
.cookie-actions { display: flex; gap: .6rem; }
.cookie-dialog { border: 1px solid var(--border); border-radius: 14px; width: min(520px, 94vw); }
.dialog-body { margin: 0; padding: 1rem; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; margin: .75rem 0; }
@media (max-width: 860px) { .hero { grid-template-columns: 1fr; } }`;
}

function script(defaultAnalyticsOptIn: boolean): string {
  return `(() => {
  const STORAGE_KEY = "bbb_cookie_preferences";
  const banner = document.getElementById("cookie-banner");
  const acceptAll = document.getElementById("accept-all-cookies");
  const manage = document.getElementById("manage-cookies");
  const dialog = document.getElementById("cookie-dialog");
  const save = document.getElementById("save-cookie-preferences");
  const analyticsOptIn = document.getElementById("analytics-opt-in");
  const fallback = { essential: true, analytics: ${defaultAnalyticsOptIn ? "true" : "false"} };
  const readPreference = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const writePreference = (value) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); document.documentElement.dataset.analytics = value.analytics ? "enabled" : "disabled"; };
  const current = readPreference();
  if (!current) { banner?.classList.add("visible"); writePreference(fallback); } else { writePreference(current); }
  acceptAll?.addEventListener("click", () => { banner?.classList.remove("visible"); writePreference({ essential: true, analytics: true }); });
  manage?.addEventListener("click", () => { const value = readPreference() || fallback; if (analyticsOptIn) analyticsOptIn.checked = !!value.analytics; dialog?.showModal?.(); });
  save?.addEventListener("click", (event) => { event.preventDefault(); writePreference({ essential: true, analytics: !!analyticsOptIn?.checked }); dialog?.close?.(); banner?.classList.remove("visible"); });
})();`;
}

export async function generateStaticSite(
  project: ProjectRecord,
  compliance: ComplianceSummary,
  options: GenerationOptions
): Promise<GeneratedResult> {
  const profile = project.profile;
  const content = normalizeGeneratedContent(profile, project.content);
  const layout = project.layout || { presetId: DEFAULT_LAYOUT_ID };
  const sections = normalizeSections(layout, project.sections);
  const slug = createSlug(profile.slug || profile.name);
  const siteDir = path.join(generatedRoot, project.id, slug);
  await fs.rm(siteDir, { recursive: true, force: true });
  await fs.mkdir(path.join(siteDir, "assets"), { recursive: true });

  const images = await materializeImages(project, profile, siteDir);
  const hero = images.find((image) => image.hero) || images[0];
  const { vars, buttonStyle } = resolveTheme(project.theme);
  const themeCss = themeVarsToCss(vars);

  await fs.writeFile(path.join(siteDir, "assets", "styles.css"), styles(themeCss, buttonRadius(buttonStyle)), "utf8");
  await fs.writeFile(path.join(siteDir, "assets", "site.js"), script(Boolean(profile.privacyTrackerOptIn)), "utf8");

  const rendered = renderFromModelToHTML({
    profile,
    content,
    sections,
    images
  });

  const pages: Array<{ name: string; file: string; body: string; path: string }> = [
    { name: "Home", file: "index.html", body: rendered.home, path: "/index.html" },
    {
      name: "Products and Services",
      file: "services.html",
      body: rendered.services,
      path: "/services.html"
    },
    { name: "About", file: "about.html", body: rendered.about, path: "/about.html" },
    { name: "Contact", file: "contact.html", body: rendered.contact, path: "/contact.html" },
    { name: "Privacy", file: "privacy.html", body: rendered.privacy, path: "/privacy.html" }
  ];

  for (const page of pages) {
    const html = renderLayout(profile, content, {
      title: page.name === "Home" ? content.siteTitle : `${profile.name} | ${page.name}`,
      description: content.metaDescription,
      body: page.body,
      pageName: page.name,
      pageFile: page.file,
      faqs: content.faqs,
      ogImage: hero.src
    });
    await fs.writeFile(path.join(siteDir, page.file), html, "utf8");
  }

  const baseUrl = content.contact.website || profile.contact.website || `https://example.com/${slug}`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${baseUrl}${page.path}</loc></url>`).join("\n")}
</urlset>`;

  await fs.writeFile(path.join(siteDir, "sitemap.xml"), sitemap, "utf8");
  await fs.writeFile(path.join(siteDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n", "utf8");
  await fs.writeFile(path.join(siteDir, "compliance-report.json"), JSON.stringify(compliance, null, 2), "utf8");

  if (options.includeLlmsTxt) {
    await fs.writeFile(
      path.join(siteDir, "llms.txt"),
      `Project: ${profile.name}\nSummary: ${truncate(content.metaDescription, 300)}\nContact: ${content.contact.email || content.contact.phone || "contact page"}\n`,
      "utf8"
    );
  }
  if (options.includeHumansTxt) {
    await fs.writeFile(
      path.join(siteDir, "humans.txt"),
      `/* TEAM */\nBusiness: ${profile.name}\nSite generated by BBB Profile Website Builder\n`,
      "utf8"
    );
  }

  return { siteDir, slug, pages: pages.map((page) => page.file) };
}
