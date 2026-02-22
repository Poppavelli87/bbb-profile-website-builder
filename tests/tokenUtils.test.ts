import { describe, expect, it } from "vitest";
import { addToken, normalizeTokens, removeToken } from "@/lib/shared";

describe("token utilities", () => {
  it("normalizes comma and newline delimited input with trim and case-insensitive dedupe", () => {
    const normalized = normalizeTokens(" Roof Repair, gutter install\nroof repair ,  window cleaning ");
    expect(normalized).toEqual(["Roof Repair", "gutter install", "window cleaning"]);
  });

  it("adds and removes tokens without creating case-insensitive duplicates", () => {
    const start = ["Roof Repair"];
    const added = addToken(start, "roof repair");
    expect(added).toEqual(["Roof Repair"]);

    const addedSecond = addToken(added, "Gutter Install");
    expect(addedSecond).toEqual(["Roof Repair", "Gutter Install"]);

    const removed = removeToken(addedSecond, "gutter install");
    expect(removed).toEqual(["Roof Repair"]);
  });
});
