import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  it("returns ok response", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
