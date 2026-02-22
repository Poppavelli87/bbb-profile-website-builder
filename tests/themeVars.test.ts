import { describe, expect, it } from "vitest";
import { getThemePreset, resolveTheme, themeVarsToCss } from "@/lib/shared";

describe("theme presets", () => {
  it("applies preset variables to css output", () => {
    const preset = getThemePreset("coastal");
    const resolved = resolveTheme({ presetId: preset.id, overrides: {}, buttonStyle: preset.buttonStyle });
    const css = themeVarsToCss(resolved.vars);

    expect(resolved.vars.bg).toBe(preset.vars.bg);
    expect(resolved.vars.primary).toBe(preset.vars.primary);
    expect(css).toContain(`--bg: ${preset.vars.bg};`);
    expect(css).toContain(`--accent: ${preset.vars.accent};`);
  });
});
