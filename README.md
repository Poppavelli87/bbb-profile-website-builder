# BBB Profile Website Builder

Full-stack monorepo that turns BBB profile captures into production-ready, privacy-first static business websites.

## What It Does

- Accepts a BBB profile URL and attempts robots-compliant extraction.
- Supports fallback modes when direct extraction is restricted:
  - Upload saved HTML capture
  - Manual entry with uploaded images
- Extracts and normalizes:
  - Business name
  - Categories and services
  - Description/about copy
  - Contact details
  - Hours and service areas
  - Accessible images/logos
- Runs ad-copy guardrails aligned with BBB Code of Advertising principles.
- Generates SEO + AEO optimized static pages:
  - Home, Services, About, Reviews (optional), Contact, Privacy
  - JSON-LD (LocalBusiness, WebSite, BreadcrumbList, FAQPage)
  - sitemap.xml, robots.txt, OG/Twitter tags
  - llms.txt and humans.txt (optional)
- Enforces privacy defaults:
  - Essential cookies only by default
  - No tracking until explicit opt-in
  - Cookie banner + preferences dialog
- Exports site as ZIP and optionally publishes files to `generated-sites/<slug>/`.
- Optional PR creation via `gh` CLI from the Publish action.

## Compliance and Safety

The extractor does **not** bypass paywalls, authentication, rate limits, anti-bot systems, robots.txt, or Terms of Use.

If extraction is blocked or disallowed, the API returns fallback guidance and the UI supports user-provided capture/manual modes.

Only publicly accessible image URLs are fetched. Failed or restricted images remain unchanged or use placeholders.

## Monorepo Structure

- `apps/web` - Next.js 14 App Router + TypeScript + Tailwind UI
- `apps/api` - Fastify + TypeScript API, extraction, generation, publish flow
- `packages/shared` - Shared Zod schemas, profile types, compliance rules engine
- `generated-sites` - Published static outputs for easy hosting

## API Endpoints

- `POST /api/extract` `{ url }`
- `POST /api/extract-html` `{ html, sourceUrl }`
- `POST /api/projects` `{ profile }`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `POST /api/projects/:id/images` (multipart upload)
- `POST /api/projects/:id/generate`
- `GET /api/jobs/:id`
- `GET /api/projects/:id/download`
- `POST /api/projects/:id/publish` `{ createPr }`

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Playwright browser runtime (installed by `npm install` scripts or manually)

### Install

```bash
npm install
```

### Run dev (one command)

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

### Validate

```bash
npm run lint
npm run typecheck
npm run test
```

## How Extraction Works

1. Validates URL is on `bbb.org` and resembles a business profile path.
2. Reads `robots.txt` and checks user-agent allow status.
3. Uses Playwright to render/capture DOM where allowed.
4. Parses profile data resiliently from common selectors and metadata.
5. Returns normalized typed profile payload.

### Fallback Modes

When extraction fails or is restricted:

- Upload saved profile HTML and parse locally (`/api/extract-html`)
- Use manual entry mode and upload screenshots/photos

## Guardrails Engine

The shared compliance engine flags risky phrases such as:

- Unqualified superlatives (`best`, `#1`, `guaranteed`, `lowest price`, `free`)
- Comparative savings claims without clear basis
- `lifetime guarantee` without definition
- Testimonials implying atypical outcomes without disclosure

Each issue includes:

- Why it is risky
- Required substantiation
- Safer rewrite suggestion

Compliance summary is exported in generated site output as `compliance-summary.json`.

## Publishing Generated Sites

### In-app Publish

- **Publish to repo** copies generated files to `generated-sites/<slug>/`
- **Create PR** additionally attempts git branch + commit + `gh pr create`

If `gh` is unavailable or not authenticated, API returns clear manual instructions.

### Manual GitHub Pages Option

If you want GitHub Pages from `generated-sites`:

1. Publish site into `generated-sites/<slug>/`
2. Commit and push
3. Configure Pages to serve the repo (or branch/folder strategy you prefer)

## Docker

### Build and run with Compose

```bash
docker compose up --build
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Deployment Options

- Docker host (single VM/container platform)
- Render (web service + API service)
- Fly.io (separate app processes)
- Railway (split services or monolith with process types)

For managed hosts, configure:

- `NEXT_PUBLIC_API_BASE` for web
- API writable paths for `storage/`, `uploads/`, and `generated/`
- Persistent volume if you need long-term project data

## Tests Included

- Unit:
  - `packages/shared/test/compliance.test.ts`
  - `apps/api/test/parser.test.ts`
- API integration:
  - `apps/api/test/api.integration.test.ts`
- Web e2e (Playwright, mocked extraction/API flow):
  - `apps/web/e2e/builder-flow.spec.ts`

## Create and Push GitHub Repo

If `gh` is installed and authenticated:

```bash
git init
git add .
git commit -m "Initial production-ready BBB profile website builder"
gh repo create bbb-profile-website-builder --source . --public --push
```

If `gh` is not available, create the repo on GitHub and push manually.
