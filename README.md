# BBB Minisite Engine

Internal BBB publishing app built on a single Next.js full-stack deployment for Vercel.

## What this app does

- Internal builder at `/admin`.
- Public minisites at `/site/[slug]`.
- Runtime rendering of published minisites from stored `SiteDefinition` data.
- Publishing flow with compliance checks and live URL response.
- ZIP export and preview remain available in admin.

## Core routes

- `/` Internal landing page
- `/admin` Builder (protected)
- `/admin/sites` Site index, search, filters, quick actions
- `/site/[slug]` Public minisite renderer

## Admin auth

Admin routes are protected by a password gate.

- Env var: `ADMIN_PASSWORD`
- Session cookie: httpOnly, 12-hour expiration
- Login endpoint: `POST /api/admin/login`
- Logout endpoint: `POST /api/admin/logout`

If `ADMIN_PASSWORD` is not set, auth checks are bypassed for local convenience.

## Storage model

### Sites (publish model)

`Site` fields:

- `id` (uuid)
- `slug` (unique)
- `businessName`
- `status` (`draft` | `published` | `archived`)
- `tier` (`free` | `premium` | `pro`)
- `siteDefinitionJson` (theme, layout, sections, content, profile)
- `complianceJson`
- `createdAt`, `updatedAt`, `publishedAt`
- `createdBy`

### Backends

- Primary: Postgres via `@vercel/postgres` when `POSTGRES_URL` (or related Postgres env) is configured
- Fallback: JSON files in `./data/sites` (local dev fallback)

## Asset handling

- Preferred: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- Fallback: local upload storage under `./data/uploads` and `/api/uploads/...`

Note: local uploads are not durable in serverless production. Use Blob for production-grade media.

## API endpoints

### Admin auth

- `POST /api/admin/login`
- `POST /api/admin/logout`

### Admin sites

- `GET /api/admin/sites` (search/filter index)
- `POST /api/admin/sites` (create draft)
- `GET /api/admin/sites/:id`
- `PUT /api/admin/sites/:id`
- `POST /api/admin/sites/:id/publish`
- `POST /api/admin/sites/:id/unpublish`
- `POST /api/admin/sites/:id/archive`

### Public debug

- `GET /api/public/site/:slug`

### Existing builder/extraction APIs

- `POST /api/extract`
- `POST /api/extract-html`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `POST /api/projects/:id/images`
- `POST /api/projects/:id/generate`
- `POST /api/projects/:id/render`
- `GET /api/projects/:id/download`

## Local development

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Configure env (recommended)

Create `.env.local`:

```bash
ADMIN_PASSWORD=change-me
# Optional: production-like URL used by publish responses
NEXT_PUBLIC_PUBLIC_SITE_BASE_URL=https://ethicalct.com
# Optional: persistent production storage
POSTGRES_URL=postgres://...
# Optional: durable image storage
BLOB_READ_WRITE_TOKEN=...
```

### Start

```bash
npm run dev
```

Open:

- `http://localhost:3000/admin`

### Verify

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deploy to Vercel

1. Import this repo in Vercel as a Next.js project.
2. Set environment variables:
   - `ADMIN_PASSWORD` (required for protected admin access)
   - `NEXT_PUBLIC_PUBLIC_SITE_BASE_URL` (recommended, set to `https://ethicalct.com`)
   - `POSTGRES_URL` (recommended for persistent site data)
   - `BLOB_READ_WRITE_TOKEN` (recommended for durable media)
3. Deploy.

## Domain routing for ethicalct.com

Point `ethicalct.com` to Vercel. Public minisites can be served as `https://ethicalct.com/<slug>` by adding a rewrite.

Example rewrite config is provided in:

- `vercel.rewrites.example.json`

You can copy it to `vercel.json` when ready.

## Tier model (feature flags for now)

- `free`: core minisite publishing
- `premium`: advanced theme and layout presets
- `pro`: reserved for future expanded capabilities

The tier is persisted and exposed in admin APIs/list views; behavior toggles can be added incrementally.

## Compliance behavior

- Publishing recomputes compliance checks from the current site definition.
- If high-risk issues are found, publish requires explicit confirmation.
- Compliance summaries are stored in `complianceJson`.

## Notes

- No GitHub Pages deployment is used.
- This app is designed for Vercel as a single full-stack deployment.
