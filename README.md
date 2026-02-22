# BBB Profile Website Builder

A single Next.js full-stack app that builds privacy-first static business websites from BBB profile input.

## What this app does

- Intake modes:
  - URL attempt (best effort, compliant fetch only)
  - Upload HTML file
  - Manual entry
- Extracts and normalizes business data:
  - Name, categories/services, description/about
  - Contact details, hours, service areas
  - Profile image URLs when available
- Lets users upload photos via drag-and-drop.
- Runs BBB-style ad-copy compliance guardrails with safer rewrite suggestions.
- Generates a static site bundle with:
  - `index.html`, `services.html`, `about.html`, `contact.html`, `privacy.html`
  - `sitemap.xml`, `robots.txt`, `llms.txt`
  - JSON-LD LocalBusiness + FAQ schema
  - `compliance-report.json`
- Provides preview and ZIP download.

## Compliance behavior

- The app does **not** bypass anti-bot systems, authentication, paywalls, or restricted access.
- URL extraction can fail depending on site policies or access controls.
- If URL extraction is blocked, the UI prompts fallback modes:
  - Upload HTML
  - Manual entry

## Tech stack

- Next.js 14 App Router (single app at repo root)
- TypeScript + Zod
- Route handlers under `app/api/*`
- Filesystem storage under:
  - Local: `./data`
  - Vercel: `/tmp/bbb-profile-builder`
- Vitest tests

## API routes

- `GET /api/health`
- `POST /api/extract`
- `POST /api/extract-html`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `POST /api/projects/:id/images`
- `POST /api/projects/:id/generate`
- `GET /api/jobs/:id`
- `GET /api/projects/:id/download`
- `GET /api/preview/:projectId/:slug/:assetPath...`

## Local development

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run (one command)

```bash
npm run dev
```

Open:

- App: `http://localhost:3000`

### Validate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deploy to Vercel

1. Push your latest `main` branch to GitHub.
2. In Vercel, click **Add New Project**.
3. Import `bbb-profile-website-builder`.
4. Framework preset: **Next.js**.
5. Build settings (defaults are fine):
   - Build Command: `npm run build`
   - Output: Next.js default
6. Deploy.

No external database or extra service configuration is required.

## Troubleshooting

### URL extraction fails

- Expected in some cases due to access policy, robots, terms, or non-HTML responses.
- Use **Upload HTML** or **Manual Entry** mode.

### Uploaded images not showing

- Re-upload images from local files.
- Ensure image formats are standard (`jpg`, `png`, `webp`, `gif`).

### ZIP download missing

- Regenerate the project and wait for job status `done` before downloading.

### Vercel runtime storage

- Vercel uses ephemeral `/tmp` storage.
- Generated files and project data are runtime-session scoped.

## Testing

Included tests:

- `tests/rulesEngine.test.ts`
- `tests/parser.test.ts`
- `tests/apiHealth.test.ts`
