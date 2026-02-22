type PrivacyPolicyTemplateInput = {
  businessName: string;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  analyticsEnabled: boolean;
  additionalNotes?: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function valueOrPlaceholder(value: string | undefined, placeholder: string): string {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : placeholder;
}

export function renderPrivacyPolicyTemplate(input: PrivacyPolicyTemplateInput): string {
  const businessName = escapeHtml(input.businessName.trim() || "This business");
  const email = valueOrPlaceholder(input.contact.email, "[Insert business email]");
  const phone = valueOrPlaceholder(input.contact.phone, "[Insert business phone]");
  const address = valueOrPlaceholder(input.contact.address, "[Insert business address]");
  const notes = input.additionalNotes?.trim();

  return `<section class="panel">${renderPrivacyPolicyBody({
    businessName,
    email,
    phone,
    address,
    analyticsEnabled: input.analyticsEnabled,
    notes
  })}</section>`;
}

type RenderBodyArgs = {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  analyticsEnabled: boolean;
  notes?: string;
};

export function renderPrivacyPolicyBodyFromInput(input: PrivacyPolicyTemplateInput): string {
  const businessName = escapeHtml(input.businessName.trim() || "This business");
  const email = valueOrPlaceholder(input.contact.email, "[Insert business email]");
  const phone = valueOrPlaceholder(input.contact.phone, "[Insert business phone]");
  const address = valueOrPlaceholder(input.contact.address, "[Insert business address]");
  const notes = input.additionalNotes?.trim();
  return renderPrivacyPolicyBody({
    businessName,
    email,
    phone,
    address,
    analyticsEnabled: input.analyticsEnabled,
    notes
  });
}

function renderPrivacyPolicyBody(args: RenderBodyArgs): string {
  return `
  <h2>Privacy Policy</h2>
  <p>This Privacy Policy explains how ${args.businessName} handles information collected through this website.</p>
  <h3>Information We Collect</h3>
  <p>When you use our contact form, we may collect your name, email address, phone number, and message. We may also collect technical request data needed to keep this website operating.</p>
  <h3>How We Use Information</h3>
  <p>We use submitted information to respond to inquiries, provide requested services, and follow up about your request.</p>
  <h3>Sharing and Disclosure</h3>
  <p>We may share information with service providers that help us run this website or provide services on our behalf. We do not sell personal information through this website.</p>
  <h3>Cookies and Similar Technologies</h3>
  <p>Essential cookies are used by default to support core website functions such as security, preference storage, and basic site operation.</p>
  <p>${
    args.analyticsEnabled
      ? "Optional analytics may be enabled only after user choice. If analytics is enabled, update this policy to identify the analytics provider, cookie names, and retention details."
      : "Optional analytics cookies are not enabled by default. If optional analytics is enabled in the future, this policy should be updated with provider and cookie details."
  }</p>
  <h3>Data Retention</h3>
  <p>We retain inquiry information for as long as reasonably needed to respond to requests, deliver services, meet legal obligations, and resolve disputes.</p>
  <h3>Security</h3>
  <p>We use reasonable administrative, technical, and organizational measures designed to protect the information we maintain.</p>
  <h3>Children's Privacy</h3>
  <p>This website is not directed to children under 13, and we do not knowingly collect personal information from children through this website.</p>
  <h3>Changes to This Privacy Policy</h3>
  <p>We may update this policy from time to time. The latest version should be posted on this page with an updated effective date when practical.</p>
  <h3>Contact Us</h3>
  <p>If you have privacy questions or requests, contact us using the details below:</p>
  <ul>
    <li><strong>Email:</strong> ${args.email}</li>
    <li><strong>Phone:</strong> ${args.phone}</li>
    <li><strong>Address:</strong> ${args.address}</li>
  </ul>
  ${args.notes ? `<p><strong>Additional privacy notes:</strong> ${escapeHtml(args.notes)}</p>` : ""}
`;
}
