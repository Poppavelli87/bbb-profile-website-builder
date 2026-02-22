import type {
  BusinessProfile,
  GeneratedContent,
  ProjectSection,
  SectionId
} from "@/lib/shared";
import { renderPrivacyPolicyTemplate } from "./privacy-policy";

export type RenderableImage = {
  src: string;
  alt: string;
  hero: boolean;
};

type RenderInput = {
  profile: BusinessProfile;
  content: GeneratedContent;
  sections: ProjectSection[];
  images: RenderableImage[];
};

export type RenderedPageBodies = {
  home: string;
  services: string;
  about: string;
  contact: string;
  privacy: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function renderQuickAnswers(content: GeneratedContent): string {
  if (content.quickAnswers.length === 0) {
    return "";
  }
  return `<section class="panel quick-answers" aria-labelledby="quick-answers-heading">
  <h2 id="quick-answers-heading">Quick answers</h2>
  <div class="quick-grid">
    ${content.quickAnswers
      .map((item) => `<article><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`)
      .join("\n")}
  </div>
</section>`;
}

function renderFaq(faqs: Array<{ question: string; answer: string }>): string {
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

function renderGallery(images: RenderableImage[]): string {
  if (images.length === 0) return "";
  return `<section class="panel"><h2>Gallery</h2><div class="card-grid">
    ${images
      .map((image) => `<figure class="card"><img src="${image.src}" alt="${escapeHtml(image.alt)}" class="hero-image" /></figure>`)
      .join("\n")}
  </div></section>`;
}

function renderTypesOfBusiness(typesOfBusiness: string[]): string {
  if (typesOfBusiness.length === 0) {
    return "";
  }
  return `<section class="types-of-business" aria-label="Types of Business">
    <h3>Types of Business</h3>
    <div class="chip-list">
      ${typesOfBusiness.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
    </div>
  </section>`;
}

function sectionMarkup(sectionId: SectionId, input: RenderInput): string {
  const { profile, content, images } = input;
  const hero = images.find((image) => image.hero) || images[0];
  const aboutText = content.aboutText.trim();
  switch (sectionId) {
    case "hero":
      return `<section class="panel hero">
  <article>
    <h2>${escapeHtml(content.heroHeadline || profile.name)}</h2>
    <p>${escapeHtml(content.heroSubheadline || content.metaDescription)}</p>
    <p><a class="button" href="contact.html">${escapeHtml(content.heroCtaText || "Contact Us")}</a></p>
  </article>
  <figure><img src="${hero?.src || ""}" alt="${escapeHtml(hero?.alt || `${profile.name} image`)}" class="hero-image" /></figure>
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
      if (!aboutText) {
        return "";
      }
      return `<section class="panel"><h2>About ${escapeHtml(profile.name)}</h2><p>${escapeHtml(aboutText)}</p>${renderTypesOfBusiness(profile.typesOfBusiness || [])}</section>`;
    case "service_areas":
      return `<section class="panel"><h2>Service Areas</h2><p>${escapeHtml(content.contact.serviceAreas.join(", ") || "Contact us to confirm service coverage.")}</p></section>`;
    case "faq":
      return renderFaq(content.faqs || []);
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

export function renderFromModelToHTML(input: RenderInput): RenderedPageBodies {
  const aboutText = input.content.aboutText.trim();
  const home = input.sections
    .filter((section) => section.enabled)
    .map((section) => sectionMarkup(section.id, input))
    .filter(Boolean)
    .join("\n");

  return {
    home,
    services: `<section class="panel"><h2>Products and Services</h2>${renderTypesOfBusiness(input.profile.typesOfBusiness || [])}<div class="card-grid">${input.content.services
      .map(
        (service) =>
          `<article class="card"><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.description || "Request a tailored quote for this service.")}</p></article>`
      )
      .join("") || "<p>Products and services are available upon request.</p>"}</div></section>`,
    about: `<section class="panel"><h2>About ${escapeHtml(input.profile.name)}</h2><p>${escapeHtml(aboutText || "About information is currently unavailable.")}</p>${renderTypesOfBusiness(input.profile.typesOfBusiness || [])}</section>`,
    contact: `<section class="panel"><h2>Contact</h2>${renderContact(input.content)}</section><section class="panel"><h2>Hours</h2>${hoursTable(input.content.contact.hours || {})}</section><section class="panel"><h2>Service Areas</h2><p>${escapeHtml(input.content.contact.serviceAreas.join(", ") || "Contact us to confirm service area coverage.")}</p></section>`,
    privacy: renderPrivacyPolicyTemplate({
      businessName: input.profile.name,
      contact: input.content.contact,
      analyticsEnabled: Boolean(input.profile.privacyTrackerOptIn),
      additionalNotes: input.profile.privacyNotes
    })
  };
}
