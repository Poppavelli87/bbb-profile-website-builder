import { describe, expect, it } from "vitest";
import { applyLayoutPreset } from "@/lib/shared";

describe("layout presets", () => {
  it("selecting minimal one page produces expected section order and flags", () => {
    const applied = applyLayoutPreset("minimal-one-page");
    const order = applied.sections.map((section) => section.id);
    const enabled = new Map(applied.sections.map((section) => [section.id, section.enabled]));

    expect(order.slice(0, 4)).toEqual(["hero", "about", "services", "contact"]);
    expect(enabled.get("hero")).toBe(true);
    expect(enabled.get("about")).toBe(true);
    expect(enabled.get("services")).toBe(true);
    expect(enabled.get("contact")).toBe(true);
    expect(enabled.get("faq")).toBe(false);
    expect(enabled.get("gallery")).toBe(false);
  });
});
