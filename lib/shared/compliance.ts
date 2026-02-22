import type { BusinessProfile, ComplianceIssue, ComplianceSummary } from "./schemas";

type Rule = {
  id: string;
  type: ComplianceIssue["type"];
  pattern: RegExp;
  severity: ComplianceIssue["severity"];
  whyRisky: string;
  requiredSubstantiation: string;
  saferRewrite: string;
};

const RULES: Rule[] = [
  {
    id: "unqualified-best",
    type: "superlative",
    pattern: /(#1|\b(best|number\s*one|top\s*rated|guaranteed|guarantee|lowest\s*price|free|factory\s*direct)\b)/gi,
    severity: "high",
    whyRisky:
      "Unqualified superlatives and absolute claims can mislead consumers if not fully supported and disclosed.",
    requiredSubstantiation:
      "Provide objective third-party evidence, timeframe, market scope, and clear qualifying language.",
    saferRewrite:
      "Use specific, verifiable language like 'trusted by local homeowners since 2010' with source notes."
  },
  {
    id: "comparative-savings",
    type: "comparative_savings",
    pattern: /\b(save\s+\d+%|save\s+up\s+to|cheaper\s+than|lowest\s+cost|guaranteed\s+savings|save\s+money)\b/gi,
    severity: "high",
    whyRisky:
      "Comparative pricing or savings statements require a clear basis, comparison set, and timing.",
    requiredSubstantiation:
      "Document competitor set, measured dates, methodology, and any exclusions or assumptions.",
    saferRewrite:
      "Replace with non-comparative value language, or attach the measurable basis directly in the copy."
  },
  {
    id: "lifetime-guarantee",
    type: "lifetime_guarantee",
    pattern: /\blifetime(\s+guarantee|\s+warranty)?\b/gi,
    severity: "high",
    whyRisky:
      "'Lifetime' is ambiguous unless the duration, owner transferability, and exclusions are defined.",
    requiredSubstantiation:
      "Define whose lifetime, exact term conditions, transfer rules, and all exclusions in plain language.",
    saferRewrite:
      "Specify a concrete term like '10-year workmanship warranty' and link full warranty details."
  },
  {
    id: "testimonial-atypical",
    type: "testimonial_atypical",
    pattern: /\b(results|outcome|saved\s+me|changed\s+my\s+life|never\s+had\s+a\s+problem)\b/gi,
    severity: "medium",
    whyRisky:
      "Testimonials can imply typical outcomes unless disclosures clarify representativeness.",
    requiredSubstantiation:
      "Add disclosure about typical results and keep source/permission records for each testimonial.",
    saferRewrite:
      "Pair testimonials with 'Individual results vary' and factual context on typical customer outcomes."
  }
];

function collectText(profile: BusinessProfile): Array<{ field: string; text: string }> {
  const blocks: Array<{ field: string; text: string }> = [
    { field: "description", text: profile.description || "" },
    { field: "about", text: profile.about || "" },
    { field: "productsAndServices", text: (profile.productsAndServices || []).join(" ") }
  ];

  (profile.faqs || []).forEach((faq, idx) => {
    blocks.push({ field: `faqs[${idx}]`, text: `${faq.question} ${faq.answer}` });
  });

  (profile.quickAnswers || []).forEach((qa, idx) => {
    blocks.push({ field: `quickAnswers[${idx}]`, text: `${qa.question} ${qa.answer}` });
  });

  (profile.testimonials || []).forEach((testimonial, idx) => {
    blocks.push({ field: `testimonials[${idx}]`, text: `${testimonial.author} ${testimonial.quote}` });
  });

  return blocks;
}

export function runComplianceChecks(profile: BusinessProfile): ComplianceSummary {
  const issues: ComplianceIssue[] = [];
  const blocks = collectText(profile);

  blocks.forEach((block) => {
    RULES.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      let match = rule.pattern.exec(block.text);
      while (match) {
        issues.push({
          id: `${rule.id}-${block.field}-${match.index}`,
          field: block.field,
          phrase: match[0],
          type: rule.type,
          severity: rule.severity,
          whyRisky: rule.whyRisky,
          requiredSubstantiation: rule.requiredSubstantiation,
          saferRewrite: rule.saferRewrite
        });
        match = rule.pattern.exec(block.text);
      }
    });
  });

  return {
    reviewedAt: new Date().toISOString(),
    issues,
    requiresUserReview: issues.length > 0
  };
}

export function createSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "business-profile";
}
