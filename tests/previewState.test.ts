import { describe, expect, it } from "vitest";
import { getPreviewPanelState } from "@/lib/builder/preview";

describe("preview panel state", () => {
  it("returns placeholder state when generation has not completed", () => {
    const state = getPreviewPanelState(false, "/api/preview/project/slug/index.html");
    expect(state.mode).toBe("placeholder");
    if (state.mode === "placeholder") {
      expect(state.message).toBe("No preview yet. Click Generate Site.");
    }
  });

  it("returns iframe state only when preview is generated and url is present", () => {
    const state = getPreviewPanelState(true, "/api/preview/project/slug/index.html");
    expect(state).toEqual({
      mode: "iframe",
      src: "/api/preview/project/slug/index.html"
    });
  });
});
