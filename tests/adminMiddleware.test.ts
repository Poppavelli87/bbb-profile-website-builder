import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const originalPassword = process.env.ADMIN_PASSWORD;

afterEach(() => {
  process.env.ADMIN_PASSWORD = originalPassword;
});

describe("admin middleware", () => {
  it("blocks admin routes without a valid session cookie", async () => {
    process.env.ADMIN_PASSWORD = "test-password";

    const adminRequest = new NextRequest("http://localhost/admin");
    const adminResponse = middleware(adminRequest);
    expect(adminResponse.status).toBe(307);
    expect(adminResponse.headers.get("location")).toContain("/admin/login");

    const apiRequest = new NextRequest("http://localhost/api/admin/sites");
    const apiResponse = middleware(apiRequest);
    expect(apiResponse.status).toBe(401);
  });
});
