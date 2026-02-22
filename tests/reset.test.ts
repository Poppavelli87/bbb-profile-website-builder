import { describe, expect, it } from "vitest";
import {
  builderReducer,
  createBuilderPresentFromProfile,
  initialBuilderState
} from "@/lib/builder/reducer";
import { createEmptyProfile } from "@/lib/profile";

describe("builderReducer reset", () => {
  it("returns to initial state", () => {
    const profile = createEmptyProfile("Reset Test Co");
    const loaded = builderReducer(initialBuilderState(), {
      type: "load",
      present: createBuilderPresentFromProfile(profile),
      status: "generated"
    });
    const edited = builderReducer(loaded, {
      type: "edit",
      present: {
        ...loaded.present,
        profile: { ...loaded.present.profile!, name: "Updated Co" },
        content: { ...loaded.present.content!, heroHeadline: "Updated headline" }
      }
    });

    const reset = builderReducer(edited, { type: "reset" });
    expect(reset.status).toBe("draft");
    expect(reset.present.profile).toBeNull();
    expect(reset.present.content).toBeNull();
    expect(reset.past).toHaveLength(0);
    expect(reset.future).toHaveLength(0);
  });
});
