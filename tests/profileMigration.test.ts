import { describe, expect, it } from "vitest";
import { projectSchema } from "@/lib/shared";

describe("profile field migration", () => {
  it("migrates legacy categories/services and string lists into array tokens", () => {
    const project = projectSchema.parse({
      id: "migration-test",
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      status: "draft",
      profile: {
        mode: "manual",
        name: "Migration Co",
        slug: "migration-co",
        categories: "Roofing, Gutters\nroofing",
        services: "Roof Repair, Gutter Install\nWindow Cleaning",
        serviceAreas: "Austin, Round Rock\nCedar Park",
        description: "",
        about: "",
        contact: {
          phone: "",
          email: "",
          website: "",
          address: ""
        },
        hours: {},
        images: [],
        faqs: [],
        quickAnswers: [],
        testimonials: [],
        privacyTrackerOptIn: false,
        privacyNotes: ""
      }
    });

    expect(project.profile.typesOfBusiness).toEqual(["Roofing", "Gutters"]);
    expect(project.profile.productsAndServices).toEqual([
      "Roof Repair",
      "Gutter Install",
      "Window Cleaning"
    ]);
    expect(project.profile.serviceAreas).toEqual(["Austin", "Round Rock", "Cedar Park"]);
  });

  it("accepts string values in new token fields and normalizes them", () => {
    const project = projectSchema.parse({
      id: "migration-test-new-keys",
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      status: "draft",
      profile: {
        mode: "manual",
        name: "Token Key Co",
        slug: "token-key-co",
        typesOfBusiness: "Plumbing,\nDrain Cleaning",
        productsAndServices: "Drain cleaning, Plumbing",
        serviceAreas: "Dallas\nPlano, Frisco",
        description: "",
        about: "",
        contact: {
          phone: "",
          email: "",
          website: "",
          address: ""
        },
        hours: {},
        images: [],
        faqs: [],
        quickAnswers: [],
        testimonials: [],
        privacyTrackerOptIn: false,
        privacyNotes: ""
      }
    });

    expect(project.profile.typesOfBusiness).toEqual(["Plumbing", "Drain Cleaning"]);
    expect(project.profile.productsAndServices).toEqual(["Drain cleaning", "Plumbing"]);
    expect(project.profile.serviceAreas).toEqual(["Dallas", "Plano", "Frisco"]);
  });
});
