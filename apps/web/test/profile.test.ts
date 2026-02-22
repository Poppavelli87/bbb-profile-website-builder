import { describe, expect, it } from "vitest";
import { hoursToText, textToHours } from "../lib/profile";

describe("hour transforms", () => {
  it("round-trips formatted hours", () => {
    const source = {
      Monday: "9:00 AM - 5:00 PM",
      Tuesday: "9:00 AM - 5:00 PM"
    };

    const text = hoursToText(source);
    const parsed = textToHours(text);

    expect(parsed).toEqual(source);
  });
});
