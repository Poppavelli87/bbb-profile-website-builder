import { describe, expect, it } from "vitest";
import { runComplianceChecks } from "../src/compliance";
import type { BusinessProfile } from "../src/schemas";

const baseProfile: BusinessProfile = {
  mode: "manual",
  name: "Acme Plumbing",
  slug: "acme-plumbing",
  categories: [],
  services: ["Best drain cleaning in town"],
  description: "We are #1 and offer lifetime guarantee for all repairs.",
  about: "Save 20% compared to competitors.",
  contact: {
    phone: "",
    email: "",
    website: "",
    address: ""
  },
  hours: {},
  serviceAreas: [],
  images: [],
  faqs: [],
  quickAnswers: [],
  testimonials: [
    {
      author: "J. Doe",
      quote: "This changed my life and saved me money.",
      disclosure: ""
    }
  ],
  privacyTrackerOptIn: false,
  privacyNotes: ""
};

describe("runComplianceChecks", () => {
  it("flags risky phrases and requires review", () => {
    const summary = runComplianceChecks(baseProfile);
    expect(summary.requiresUserReview).toBe(true);
    expect(summary.issues.length).toBeGreaterThan(3);
    const phrases = summary.issues.map((i) => i.phrase.toLowerCase());
    expect(phrases).toContain("#1");
    expect(phrases.join(" ")).toContain("lifetime guarantee");
  });

  it("returns no issues for neutral copy", () => {
    const clean = {
      ...baseProfile,
      services: ["Drain cleaning", "Water heater replacement"],
      description: "Licensed and insured local plumbing services.",
      about: "Serving households in the metro area since 2010.",
      testimonials: []
    };
    const summary = runComplianceChecks(clean);
    expect(summary.issues).toHaveLength(0);
    expect(summary.requiresUserReview).toBe(false);
  });
});
