import { createSlug, type BusinessProfile } from "@/lib/shared";

export function createEmptyProfile(name = ""): BusinessProfile {
  const businessName = name || "New Business";
  return {
    mode: "manual",
    name: businessName,
    slug: createSlug(businessName),
    categories: [],
    services: [],
    description: "",
    about: "",
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
}

export function hoursToText(hours: Record<string, string>): string {
  return Object.entries(hours)
    .map(([day, value]) => `${day}: ${value}`)
    .join("\n");
}

export function textToHours(input: string): Record<string, string> {
  return input
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const [day, ...rest] = line.split(":");
      if (!day || rest.length === 0) {
        return acc;
      }
      acc[day.trim()] = rest.join(":").trim();
      return acc;
    }, {});
}

export function commaListToArray(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function arrayToCommaList(value: string[]): string {
  return value.join(", ");
}

export function textLinesToArray(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayToTextLines(value: string[]): string {
  return value.join("\n");
}
