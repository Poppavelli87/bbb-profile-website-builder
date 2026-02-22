import { test, expect } from "@playwright/test";

const mockProfile = {
  mode: "auto",
  bbbUrl: "https://www.bbb.org/us/tx/austin/profile/plumber/mock-bbb-business-0000",
  name: "Mock BBB Business",
  slug: "mock-bbb-business",
  categories: ["Home Services"],
  services: ["Drain cleaning", "Pipe repair"],
  description: "Trusted local plumbing service.",
  about: "Trusted local plumbing service.",
  contact: {
    phone: "(555) 555-5555",
    email: "hello@mock.test",
    website: "https://mock.test",
    address: "123 Main St"
  },
  hours: {
    Monday: "9:00 AM - 5:00 PM"
  },
  serviceAreas: ["Austin Metro"],
  images: [],
  faqs: [],
  quickAnswers: [],
  testimonials: [],
  privacyTrackerOptIn: false,
  privacyNotes: ""
};

test("builder flow with mocked extraction", async ({ page }) => {
  let jobPollCount = 0;

  await page.route("http://127.0.0.1:4000/api/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: mockProfile })
    });
  });

  await page.route("http://127.0.0.1:4000/api/projects", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ project: { id: "proj-1", profile: mockProfile } })
    });
  });

  await page.route("http://127.0.0.1:4000/api/projects/proj-1", async (route) => {
    const method = route.request().method();
    if (method === "PUT" || method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: { id: "proj-1", profile: mockProfile, status: "generated" } })
      });
      return;
    }

    await route.continue();
  });

  await page.route("http://127.0.0.1:4000/api/projects/proj-1/generate", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ jobId: "job-1" })
    });
  });

  await page.route("http://127.0.0.1:4000/api/jobs/job-1", async (route) => {
    jobPollCount += 1;
    const body =
      jobPollCount < 2
        ? { job: { id: "job-1", status: "running" } }
        : {
            job: {
              id: "job-1",
              status: "completed",
              result: { previewUrl: "/generated/proj-1/mock-bbb-business/index.html" }
            }
          };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });

  await page.route(
    "http://127.0.0.1:4000/generated/proj-1/mock-bbb-business/index.html",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Mock Preview</h1></body></html>"
      });
    }
  );

  await page.goto("/");
  await page.fill("#bbb-url", mockProfile.bbbUrl);
  await page.click("button:has-text('Start Workspace')");

  await expect(page.locator("text=Extracted Data")).toBeVisible();
  await page.click("button:has-text('Generate Site')");

  await expect(page.locator("text=Generation status:")).toContainText("done", { timeout: 15000 });
  await expect(page.locator("iframe[title='Generated site preview']")).toBeVisible();
});
