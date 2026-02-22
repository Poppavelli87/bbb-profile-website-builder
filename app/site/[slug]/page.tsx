/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { resolveTheme, type ProjectSection, type SiteDefinition } from "@/lib/shared";
import { getSiteBySlug } from "@/lib/server/db/sites";
import { renderPrivacyPolicyBodyFromInput } from "@/lib/server/privacy-policy";
import { liveUrlForSlug } from "@/lib/server/site-service";

type Params = {
  params: {
    slug: string;
  };
};

function sectionEnabled(sections: ProjectSection[], id: ProjectSection["id"]): boolean {
  const section = sections.find((item) => item.id === id);
  return section ? section.enabled : false;
}

function styleSheet(site: SiteDefinition): string {
  const theme = resolveTheme(site.theme);
  return `
:root {
  --bg: ${theme.vars.bg};
  --surface: ${theme.vars.surface};
  --text: ${theme.vars.text};
  --muted: ${theme.vars.muted};
  --primary: ${theme.vars.primary};
  --secondary: ${theme.vars.secondary};
  --accent: ${theme.vars.accent};
  --border: ${theme.vars.border};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, var(--bg)), var(--bg) 55%); color: var(--text); line-height: 1.6; }
a { color: var(--secondary); text-decoration-thickness: .08em; text-underline-offset: .12em; }
.container { width: min(1080px, 92vw); margin: 0 auto; }
.site-header { padding: 2rem 0 1.2rem; border-bottom: 1px solid var(--border); }
.header-grid { display: flex; justify-content: space-between; gap: 1rem; align-items: end; flex-wrap: wrap; }
.eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .08em; font-size: .75rem; color: var(--muted); }
.nav { display: flex; gap: .8rem; flex-wrap: wrap; }
.nav-link { color: var(--text); text-decoration: none; border-bottom: 2px solid transparent; padding-bottom: .2rem; }
.nav-link:hover { border-bottom-color: var(--primary); }
main { padding: 1.2rem 0 2.4rem; display: grid; gap: 1rem; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 1rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
.hero { display: grid; grid-template-columns: 1.2fr .8fr; gap: 1rem; }
.hero-image { width: 100%; height: 100%; min-height: 260px; object-fit: cover; border-radius: 14px; }
.grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.card { border: 1px solid var(--border); border-radius: 12px; padding: .8rem; background: var(--surface); }
.types-of-business { margin-top: .9rem; }
.chip-list { display: flex; flex-wrap: wrap; gap: .45rem; }
.chip { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid var(--border); background: color-mix(in srgb, var(--accent) 12%, #fff); padding: .2rem .6rem; font-size: .82rem; font-weight: 600; color: var(--text); }
.button-link { display: inline-flex; background: var(--primary); color: #fff; border-radius: 999px; padding: .5rem .9rem; text-decoration: none; font-weight: 600; }
.site-footer { border-top: 1px solid var(--border); padding: 1.2rem 0 2rem; }
.footer-grid { display: flex; justify-content: space-between; gap: .8rem; flex-wrap: wrap; }
.cookie-banner { position: fixed; left: 1rem; right: 1rem; bottom: 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: .8rem; display: none; align-items: center; justify-content: space-between; gap: .8rem; z-index: 40; flex-wrap: wrap; box-shadow: 0 20px 35px rgba(15, 23, 42, .12); }
.cookie-banner.visible { display: flex; }
.cookie-actions { display: flex; gap: .5rem; }
.btn { border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text); padding: .45rem .7rem; cursor: pointer; }
.btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
@media (max-width: 860px) { .hero { grid-template-columns: 1fr; } }
`;
}

function cookieScript(): string {
  return `(() => {
  const STORAGE_KEY = "bbb_cookie_preferences";
  const banner = document.getElementById("cookie-banner");
  const acceptAll = document.getElementById("accept-all-cookies");
  const manage = document.getElementById("manage-cookies");
  const dialog = document.getElementById("cookie-dialog");
  const save = document.getElementById("save-cookie-preferences");
  const analyticsOptIn = document.getElementById("analytics-opt-in");
  const fallback = { essential: true, analytics: false };
  const readPreference = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const writePreference = (value) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); };
  const current = readPreference();
  if (!current) { banner?.classList.add("visible"); writePreference(fallback); }
  acceptAll?.addEventListener("click", () => { banner?.classList.remove("visible"); writePreference({ essential: true, analytics: true }); });
  manage?.addEventListener("click", () => { const value = readPreference() || fallback; if (analyticsOptIn) analyticsOptIn.checked = !!value.analytics; dialog?.showModal?.(); });
  save?.addEventListener("click", (event) => { event.preventDefault(); writePreference({ essential: true, analytics: !!analyticsOptIn?.checked }); dialog?.close?.(); banner?.classList.remove("visible"); });
})();`;
}

function jsonLd(site: SiteDefinition, liveUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.profile.name,
    description: site.content.metaDescription,
    url: liveUrl,
    telephone: site.content.contact.phone || undefined,
    email: site.content.contact.email || undefined,
    address: site.content.contact.address || undefined,
    areaServed: site.content.contact.serviceAreas
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const site = await getSiteBySlug(params.slug);
  if (!site || site.status !== "published") {
    return {
      title: "Site not found"
    };
  }
  const liveUrl = liveUrlForSlug(site.slug);
  return {
    title: site.siteDefinitionJson.content.siteTitle,
    description: site.siteDefinitionJson.content.metaDescription,
    alternates: {
      canonical: liveUrl
    },
    openGraph: {
      title: site.siteDefinitionJson.content.siteTitle,
      description: site.siteDefinitionJson.content.metaDescription,
      url: liveUrl
    }
  };
}

export default async function PublicSitePage({ params }: Params) {
  const site = await getSiteBySlug(params.slug);
  if (!site || site.status !== "published") {
    notFound();
  }
  const model = site.siteDefinitionJson;
  const content = model.content;
  const sections = model.sections;
  const heroImage = model.profile.images.find((image) => image.selectedHero) || model.profile.images[0];
  const liveUrl = liveUrlForSlug(site.slug);

  return (
    <main>
      <style>{styleSheet(model)}</style>
      <Script id={`schema-${site.id}`} type="application/ld+json">
        {JSON.stringify(jsonLd(model, liveUrl))}
      </Script>
      <header className="site-header">
        <div className="container header-grid">
          <div>
            <p className="eyebrow">Published BBB minisite</p>
            <h1>{model.profile.name}</h1>
          </div>
          <nav aria-label="Primary" className="nav">
            <a className="nav-link" href="#services">Products and Services</a>
            <a className="nav-link" href="#about">About</a>
            <a className="nav-link" href="#contact">Contact</a>
            <a className="nav-link" href="#privacy">Privacy</a>
          </nav>
        </div>
      </header>

      <section className="container">
        <div>
          {sectionEnabled(sections, "hero") ? (
            <section className="panel hero">
              <article>
                <h2>{content.heroHeadline || model.profile.name}</h2>
                <p>{content.heroSubheadline || content.metaDescription}</p>
                <p>
                  <a className="button-link" href="#contact">
                    {content.heroCtaText || "Contact"}
                  </a>
                </p>
              </article>
              <figure>
                <img
                  className="hero-image"
                  src={heroImage?.url || "https://placehold.co/1200x700?text=Business+Photo"}
                  alt={heroImage?.alt || `${model.profile.name} image`}
                />
              </figure>
            </section>
          ) : null}

          {sectionEnabled(sections, "quick_answers") && content.quickAnswers.length > 0 ? (
            <section className="panel">
              <h2>Quick answers</h2>
              <div className="grid">
                {content.quickAnswers.map((item) => (
                  <article key={`${item.question}-${item.answer}`} className="card">
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {sectionEnabled(sections, "services") ? (
            <section className="panel" id="services">
              <h2>Products and Services</h2>
              <div className="grid">
                {content.services.map((service) => (
                  <article key={service.name} className="card">
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {sectionEnabled(sections, "about") && content.aboutText.trim().length > 0 ? (
            <section className="panel" id="about">
              <h2>About</h2>
              <p>{content.aboutText.trim()}</p>
              {model.profile.typesOfBusiness.length > 0 ? (
                <div className="types-of-business">
                  <h3>Types of Business</h3>
                  <div className="chip-list">
                    {model.profile.typesOfBusiness.map((item) => (
                      <span key={item} className="chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {sectionEnabled(sections, "service_areas") ? (
            <section className="panel">
              <h2>Service Areas</h2>
              <p>{content.contact.serviceAreas.join(", ") || "Contact us for service coverage."}</p>
            </section>
          ) : null}

          {sectionEnabled(sections, "faq") && content.faqs.length > 0 ? (
            <section className="panel">
              <h2>Frequently asked questions</h2>
              <div className="grid">
                {content.faqs.map((faq) => (
                  <article key={`${faq.question}-${faq.answer}`} className="card">
                    <h3>{faq.question}</h3>
                    <p>{faq.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {sectionEnabled(sections, "hours") ? (
            <section className="panel">
              <h2>Hours</h2>
              {Object.entries(content.contact.hours || {}).length > 0 ? (
                <ul>
                  {Object.entries(content.contact.hours).map(([day, value]) => (
                    <li key={day}>
                      <strong>{day}:</strong> {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Hours available on request.</p>
              )}
            </section>
          ) : null}

          {sectionEnabled(sections, "contact") ? (
            <section className="panel" id="contact">
              <h2>Contact</h2>
              <ul>
                <li>
                  <strong>Phone:</strong> {content.contact.phone || "Available on request"}
                </li>
                <li>
                  <strong>Email:</strong> {content.contact.email || "Available on request"}
                </li>
                <li>
                  <strong>Address:</strong> {content.contact.address || "Available on request"}
                </li>
              </ul>
            </section>
          ) : null}

          {sectionEnabled(sections, "gallery") && model.profile.images.length > 0 ? (
            <section className="panel">
              <h2>Gallery</h2>
              <div className="grid">
                {model.profile.images.map((image) => (
                  <figure key={image.id} className="card">
                    <img className="hero-image" src={image.url} alt={image.alt || `${model.profile.name} image`} />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel" id="privacy">
            <div
              dangerouslySetInnerHTML={{
                __html: renderPrivacyPolicyBodyFromInput({
                  businessName: model.profile.name,
                  contact: content.contact,
                  analyticsEnabled: Boolean(model.profile.privacyTrackerOptIn),
                  additionalNotes: model.profile.privacyNotes
                })
              }}
            />
          </section>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <p>{model.profile.name}</p>
          <a href="#privacy">Privacy Policy</a>
        </div>
      </footer>

      <section id="cookie-banner" className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie settings">
        <p>We use essential cookies only by default. Optional analytics stays off until you opt in.</p>
        <div className="cookie-actions">
          <button id="accept-all-cookies" className="btn primary">
            Accept all cookies
          </button>
          <button id="manage-cookies" className="btn">
            Manage cookies
          </button>
        </div>
      </section>
      <dialog id="cookie-dialog">
        <form method="dialog">
          <h2>Cookie Preferences</h2>
          <p>Essential cookies are always enabled. Analytics is optional and disabled by default.</p>
          <label>
            <span>Essential cookies</span>
            <input type="checkbox" checked disabled />
          </label>
          <label>
            <span>Analytics cookies</span>
            <input id="analytics-opt-in" type="checkbox" />
          </label>
          <menu>
            <button id="save-cookie-preferences">Save preferences</button>
          </menu>
        </form>
      </dialog>
      <Script id={`cookie-script-${site.id}`}>{cookieScript()}</Script>
    </main>
  );
}
