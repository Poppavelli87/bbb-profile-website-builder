import { describe, expect, it } from "vitest";
import { runComplianceChecks, type BusinessProfile } from "@/lib/shared";

const profile: BusinessProfile = {
  mode: "manual",
  name: "Acme Services",
  slug: "acme-services",
  typesOfBusiness: [],
  productsAndServices: ["Best roof repair", "Factory direct materials"],
  description: "We are #1 and offer lifetime guarantee.",
  about: "Save up to 40% versus competitors.",
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
  testimonials: [],
  privacyTrackerOptIn: false,
  privacyNotes: ""
};

describe("runComplianceChecks", () => {
  it("flags risky advertising claims", () => {
    const summary = runComplianceChecks(profile);
    const phrases = summary.issues.map((issue) => issue.phrase.toLowerCase());
    expect(summary.requiresUserReview).toBe(true);
    expect(phrases.join(" ")).toContain("best");
    expect(phrases.join(" ")).toContain("#1");
    expect(phrases.join(" ")).toContain("factory direct");
    expect(phrases.join(" ")).toContain("save up to");
    expect(phrases.join(" ")).toContain("lifetime");
  });
});
