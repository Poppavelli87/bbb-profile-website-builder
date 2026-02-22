import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import {
  siteIndexItemSchema,
  siteSchema,
  validateSiteSlug,
  type ComplianceSummary,
  type SiteDefinition,
  type SiteIndexItem,
  type SiteRecord,
  type SiteStatus,
  type SiteTier
} from "@/lib/shared";
import { ensureRuntimeDirs, siteStorageDir } from "../paths";

type SiteQuery = {
  search?: string;
  status?: SiteStatus;
  tier?: SiteTier;
};

type CreateSiteInput = {
  slug: string;
  businessName: string;
  tier?: SiteTier;
  siteDefinitionJson: SiteDefinition;
  complianceJson?: ComplianceSummary;
  createdBy?: string;
};

type UpdateSiteInput = Partial<CreateSiteInput> & {
  status?: SiteStatus;
  publishedAt?: string | null;
};

const SITES_TABLE = "bbb_sites";
let postgresReady = false;

function postgresConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

async function ensurePostgresTable(): Promise<void> {
  if (!postgresConfigured() || postgresReady) return;
  await sql.query(
    `CREATE TABLE IF NOT EXISTS ${SITES_TABLE} (
      id UUID PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      business_name TEXT NOT NULL,
      status TEXT NOT NULL,
      tier TEXT NOT NULL,
      site_definition_json JSONB NOT NULL,
      compliance_json JSONB,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      published_at TIMESTAMPTZ,
      created_by TEXT
    )`
  );
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_${SITES_TABLE}_slug ON ${SITES_TABLE}(slug)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_${SITES_TABLE}_status ON ${SITES_TABLE}(status)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_${SITES_TABLE}_tier ON ${SITES_TABLE}(tier)`);
  postgresReady = true;
}

function rowToSiteRecord(row: Record<string, unknown>): SiteRecord {
  return siteSchema.parse({
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    status: row.status,
    tier: row.tier,
    siteDefinitionJson: row.site_definition_json,
    complianceJson: row.compliance_json || undefined,
    createdAt: new Date(row.created_at as string | number | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | number | Date).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at as string | number | Date).toISOString() : undefined,
    createdBy: row.created_by || undefined
  });
}

function filePath(siteId: string): string {
  return path.join(siteStorageDir, `${siteId}.json`);
}

async function readAllLocalSites(): Promise<SiteRecord[]> {
  ensureRuntimeDirs();
  const files = await fs.readdir(siteStorageDir).catch(() => []);
  const loaded = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(siteStorageDir, file), "utf8");
        const parsed = JSON.parse(raw) as SiteRecord;
        return siteSchema.parse(parsed);
      })
  );
  return loaded.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function writeLocalSite(site: SiteRecord): Promise<void> {
  ensureRuntimeDirs();
  await fs.writeFile(filePath(site.id), JSON.stringify(site, null, 2), "utf8");
}

function matchesQuery(site: SiteRecord, query: SiteQuery): boolean {
  if (query.status && site.status !== query.status) return false;
  if (query.tier && site.tier !== query.tier) return false;
  if (query.search) {
    const term = query.search.toLowerCase();
    const hay = `${site.slug} ${site.businessName}`.toLowerCase();
    if (!hay.includes(term)) return false;
  }
  return true;
}

function toIndexItem(site: SiteRecord): SiteIndexItem {
  return siteIndexItemSchema.parse({
    id: site.id,
    slug: site.slug,
    businessName: site.businessName,
    status: site.status,
    tier: site.tier,
    updatedAt: site.updatedAt,
    publishedAt: site.publishedAt
  });
}

export async function listSiteIndex(query: SiteQuery = {}): Promise<SiteIndexItem[]> {
  if (postgresConfigured()) {
    await ensurePostgresTable();
    const clauses: string[] = [];
    const params: Array<string> = [];
    if (query.search) {
      params.push(`%${query.search}%`);
      clauses.push(`(slug ILIKE $${params.length} OR business_name ILIKE $${params.length})`);
    }
    if (query.status) {
      params.push(query.status);
      clauses.push(`status = $${params.length}`);
    }
    if (query.tier) {
      params.push(query.tier);
      clauses.push(`tier = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await sql.query(
      `SELECT id, slug, business_name, status, tier, updated_at, published_at FROM ${SITES_TABLE} ${where} ORDER BY updated_at DESC`,
      params
    );
    return result.rows.map((row) =>
      siteIndexItemSchema.parse({
        id: row.id,
        slug: row.slug,
        businessName: row.business_name,
        status: row.status,
        tier: row.tier,
        updatedAt: new Date(row.updated_at as string | number | Date).toISOString(),
        publishedAt: row.published_at
          ? new Date(row.published_at as string | number | Date).toISOString()
          : undefined
      })
    );
  }

  const local = await readAllLocalSites();
  return local.filter((site) => matchesQuery(site, query)).map(toIndexItem);
}

export async function getSiteById(siteId: string): Promise<SiteRecord | null> {
  if (postgresConfigured()) {
    await ensurePostgresTable();
    const result = await sql.query(`SELECT * FROM ${SITES_TABLE} WHERE id = $1 LIMIT 1`, [siteId]);
    if (result.rows.length === 0) return null;
    return rowToSiteRecord(result.rows[0]);
  }

  const target = filePath(siteId);
  try {
    const raw = await fs.readFile(target, "utf8");
    return siteSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getSiteBySlug(slug: string): Promise<SiteRecord | null> {
  const normalized = validateSiteSlug(slug).slug;
  if (postgresConfigured()) {
    await ensurePostgresTable();
    const result = await sql.query(`SELECT * FROM ${SITES_TABLE} WHERE slug = $1 LIMIT 1`, [normalized]);
    if (result.rows.length === 0) return null;
    return rowToSiteRecord(result.rows[0]);
  }

  const local = await readAllLocalSites();
  return local.find((site) => site.slug === normalized) || null;
}

export async function slugInUse(slug: string, excludeId?: string): Promise<boolean> {
  const normalized = validateSiteSlug(slug).slug;
  if (postgresConfigured()) {
    await ensurePostgresTable();
    if (excludeId) {
      const result = await sql.query(`SELECT 1 FROM ${SITES_TABLE} WHERE slug = $1 AND id <> $2 LIMIT 1`, [
        normalized,
        excludeId
      ]);
      return result.rows.length > 0;
    }
    const result = await sql.query(`SELECT 1 FROM ${SITES_TABLE} WHERE slug = $1 LIMIT 1`, [normalized]);
    return result.rows.length > 0;
  }

  const local = await readAllLocalSites();
  return local.some((site) => site.slug === normalized && site.id !== excludeId);
}

export async function createSiteDraft(input: CreateSiteInput): Promise<SiteRecord> {
  const slugValidation = validateSiteSlug(input.slug);
  if (!slugValidation.ok) {
    throw new Error(slugValidation.error || "Invalid slug.");
  }
  if (await slugInUse(slugValidation.slug)) {
    throw new Error("Slug already exists.");
  }

  const now = new Date().toISOString();
  const next = siteSchema.parse({
    id: randomUUID(),
    slug: slugValidation.slug,
    businessName: input.businessName,
    status: "draft",
    tier: input.tier || "free",
    siteDefinitionJson: input.siteDefinitionJson,
    complianceJson: input.complianceJson,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy
  });

  if (postgresConfigured()) {
    await ensurePostgresTable();
    await sql.query(
      `INSERT INTO ${SITES_TABLE} (id, slug, business_name, status, tier, site_definition_json, compliance_json, created_at, updated_at, published_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        next.id,
        next.slug,
        next.businessName,
        next.status,
        next.tier,
        JSON.stringify(next.siteDefinitionJson),
        next.complianceJson ? JSON.stringify(next.complianceJson) : null,
        next.createdAt,
        next.updatedAt,
        next.publishedAt || null,
        next.createdBy || null
      ]
    );
    return next;
  }

  await writeLocalSite(next);
  return next;
}

export async function updateSite(siteId: string, patch: UpdateSiteInput): Promise<SiteRecord | null> {
  const current = await getSiteById(siteId);
  if (!current) return null;

  let slug = current.slug;
  if (patch.slug) {
    const validation = validateSiteSlug(patch.slug);
    if (!validation.ok) {
      throw new Error(validation.error || "Invalid slug.");
    }
    if (await slugInUse(validation.slug, siteId)) {
      throw new Error("Slug already exists.");
    }
    slug = validation.slug;
  }

  const next = siteSchema.parse({
    ...current,
    ...patch,
    slug,
    status: patch.status || current.status,
    tier: patch.tier || current.tier,
    businessName: patch.businessName || current.businessName,
    siteDefinitionJson: patch.siteDefinitionJson || current.siteDefinitionJson,
    complianceJson: patch.complianceJson || current.complianceJson,
    publishedAt:
      patch.publishedAt === undefined
        ? current.publishedAt
        : patch.publishedAt || undefined,
    updatedAt: new Date().toISOString()
  });

  if (postgresConfigured()) {
    await ensurePostgresTable();
    await sql.query(
      `UPDATE ${SITES_TABLE}
       SET slug = $2, business_name = $3, status = $4, tier = $5, site_definition_json = $6, compliance_json = $7, updated_at = $8, published_at = $9, created_by = $10
       WHERE id = $1`,
      [
        next.id,
        next.slug,
        next.businessName,
        next.status,
        next.tier,
        JSON.stringify(next.siteDefinitionJson),
        next.complianceJson ? JSON.stringify(next.complianceJson) : null,
        next.updatedAt,
        next.publishedAt || null,
        next.createdBy || null
      ]
    );
    return next;
  }

  await writeLocalSite(next);
  return next;
}

export async function publishSite(
  siteId: string,
  patch?: Pick<
    UpdateSiteInput,
    "slug" | "businessName" | "tier" | "siteDefinitionJson" | "complianceJson" | "createdBy"
  >
): Promise<SiteRecord | null> {
  const current = await getSiteById(siteId);
  if (!current) return null;
  const now = new Date().toISOString();
  return updateSite(siteId, {
    ...patch,
    status: "published",
    publishedAt: now
  });
}

export async function unpublishSite(siteId: string): Promise<SiteRecord | null> {
  const current = await getSiteById(siteId);
  if (!current) return null;
  return updateSite(siteId, {
    status: "draft",
    publishedAt: null
  });
}

export async function archiveSite(siteId: string): Promise<SiteRecord | null> {
  const current = await getSiteById(siteId);
  if (!current) return null;
  return updateSite(siteId, {
    status: "archived"
  });
}
