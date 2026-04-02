import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";

export type HomeHeroCtaMode = "none" | "article" | "radio" | "magazine";

export type HomeHeroConfig = {
  badgeText: string;
  heroHtml: string;
  secondLineAsTitle: boolean;
  featuredArticleIds: string[];
  image: string | null;
  ctaMode: HomeHeroCtaMode;
  ctaTargetId: string | null;
  updatedAt: string;
};

const HOME_HERO_RECORD_ID = "home";
const LEGACY_HOME_HERO_FILE_PATH = join(
  process.cwd(),
  "data",
  "home-hero.json",
);

const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  badgeText: "شماره جدید منتشر شد",
  heroHtml:
    '<h1>داستان\u200cهایی که<br /><span style="color: #d73b3a;">الهام\u200cبخش</span> هستند</h1><p>مجله دات، پلتفرمی برای روایت داستان\u200cهای الهام\u200cبخش از دنیای طراحی، تکنولوژی و سبک زندگی مدرن.</p>',
  secondLineAsTitle: true,
  featuredArticleIds: [],
  image: null,
  ctaMode: "none",
  ctaTargetId: null,
  updatedAt: new Date(0).toISOString(),
};

function isValidCtaMode(value: string): value is HomeHeroCtaMode {
  return (
    value === "none" ||
    value === "article" ||
    value === "radio" ||
    value === "magazine"
  );
}

function normalizeTextValue(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeTextValue(value);
  return normalized || null;
}

function normalizeFeaturedArticleIds(value: unknown): string[] {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return [];

    try {
      return normalizeFeaturedArticleIds(JSON.parse(normalized));
    } catch {
      return [normalized].slice(0, 3);
    }
  }

  if (!Array.isArray(value)) return [];

  const uniqueIds: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const nextId = item.trim();
    if (!nextId) continue;
    if (uniqueIds.includes(nextId)) continue;
    uniqueIds.push(nextId);
    if (uniqueIds.length >= 3) break;
  }

  return uniqueIds;
}

function normalizeUpdatedAt(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? new Date().toISOString()
      : value.toISOString();
  }

  if (typeof value === "string") {
    const normalized = normalizeTextValue(value);
    if (!normalized) return new Date().toISOString();

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return normalized;
  }

  return new Date().toISOString();
}

function normalizeConfig(input: unknown): HomeHeroConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_HOME_HERO_CONFIG };
  }

  const raw = input as Record<string, unknown>;
  const nextModeRaw = normalizeTextValue(raw.ctaMode, "none");
  const ctaMode = isValidCtaMode(nextModeRaw) ? nextModeRaw : "none";
  const ctaTargetId =
    ctaMode === "none" ? null : normalizeNullableText(raw.ctaTargetId);
  const secondLineAsTitle =
    typeof raw.secondLineAsTitle === "boolean" ? raw.secondLineAsTitle : true;
  const featuredArticleIds = normalizeFeaturedArticleIds(
    raw.featuredArticleIds,
  );

  return {
    badgeText: normalizeTextValue(
      raw.badgeText,
      DEFAULT_HOME_HERO_CONFIG.badgeText,
    ),
    heroHtml: normalizeTextValue(
      raw.heroHtml,
      DEFAULT_HOME_HERO_CONFIG.heroHtml,
    ),
    secondLineAsTitle,
    featuredArticleIds,
    image: normalizeNullableText(raw.image),
    ctaMode,
    ctaTargetId,
    updatedAt: normalizeTextValue(raw.updatedAt, new Date().toISOString()),
  };
}

async function ensureHomeHeroStoreTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HomeHeroConfigStore" (
      "id" TEXT PRIMARY KEY,
      "badgeText" TEXT NOT NULL,
      "heroHtml" TEXT NOT NULL,
      "secondLineAsTitle" BOOLEAN NOT NULL DEFAULT TRUE,
      "featuredArticleIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "image" TEXT,
      "ctaMode" TEXT NOT NULL DEFAULT 'none',
      "ctaTargetId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function readLegacyHomeHeroConfig(): Promise<HomeHeroConfig | null> {
  try {
    const content = await readFile(LEGACY_HOME_HERO_FILE_PATH, "utf-8");
    return normalizeConfig(JSON.parse(content));
  } catch {
    return null;
  }
}

function toStorePayload(config: HomeHeroConfig) {
  return {
    badgeText: config.badgeText,
    heroHtml: config.heroHtml,
    secondLineAsTitle: config.secondLineAsTitle,
    featuredArticleIds: config.featuredArticleIds,
    image: config.image,
    ctaMode: config.ctaMode,
    ctaTargetId: config.ctaTargetId,
  };
}

type HomeHeroStoreRow = {
  badgeText: string;
  heroHtml: string;
  secondLineAsTitle: boolean;
  featuredArticleIds: unknown;
  image: string | null;
  ctaMode: string;
  ctaTargetId: string | null;
  updatedAt: unknown;
};

async function readStoreRow(): Promise<HomeHeroStoreRow | null> {
  const rows = await prisma.$queryRawUnsafe<HomeHeroStoreRow[]>(
    `
      SELECT
        "badgeText",
        "heroHtml",
        "secondLineAsTitle",
        "featuredArticleIds",
        "image",
        "ctaMode",
        "ctaTargetId",
        "updatedAt"
      FROM "HomeHeroConfigStore"
      WHERE "id" = $1
      LIMIT 1
    `,
    HOME_HERO_RECORD_ID,
  );

  return rows[0] || null;
}

async function upsertStoreRow(
  config: HomeHeroConfig,
): Promise<HomeHeroStoreRow> {
  const payload = toStorePayload(config);
  const rows = await prisma.$queryRawUnsafe<HomeHeroStoreRow[]>(
    `
      INSERT INTO "HomeHeroConfigStore" (
        "id",
        "badgeText",
        "heroHtml",
        "secondLineAsTitle",
        "featuredArticleIds",
        "image",
        "ctaMode",
        "ctaTargetId",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6,
        $7,
        $8,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id")
      DO UPDATE SET
        "badgeText" = EXCLUDED."badgeText",
        "heroHtml" = EXCLUDED."heroHtml",
        "secondLineAsTitle" = EXCLUDED."secondLineAsTitle",
        "featuredArticleIds" = EXCLUDED."featuredArticleIds",
        "image" = EXCLUDED."image",
        "ctaMode" = EXCLUDED."ctaMode",
        "ctaTargetId" = EXCLUDED."ctaTargetId",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "badgeText",
        "heroHtml",
        "secondLineAsTitle",
        "featuredArticleIds",
        "image",
        "ctaMode",
        "ctaTargetId",
        "updatedAt"
    `,
    HOME_HERO_RECORD_ID,
    payload.badgeText,
    payload.heroHtml,
    payload.secondLineAsTitle,
    JSON.stringify(payload.featuredArticleIds),
    payload.image,
    payload.ctaMode,
    payload.ctaTargetId,
  );

  const saved = rows[0];
  if (!saved) {
    throw new Error("Home hero config upsert did not return a record");
  }

  return saved;
}

function fromStoreRecord(record: HomeHeroStoreRow): HomeHeroConfig {
  return normalizeConfig({
    badgeText: record.badgeText,
    heroHtml: record.heroHtml,
    secondLineAsTitle: record.secondLineAsTitle,
    featuredArticleIds: record.featuredArticleIds,
    image: record.image,
    ctaMode: record.ctaMode,
    ctaTargetId: record.ctaTargetId,
    updatedAt: normalizeUpdatedAt(record.updatedAt),
  });
}

export function getDefaultHomeHeroConfig(): HomeHeroConfig {
  return { ...DEFAULT_HOME_HERO_CONFIG };
}

export async function readHomeHeroConfig(): Promise<HomeHeroConfig> {
  try {
    await ensureHomeHeroStoreTable();

    const existing = await readStoreRow();

    if (existing) {
      return fromStoreRecord(existing);
    }

    const legacyConfig = await readLegacyHomeHeroConfig();
    const initialConfig = legacyConfig || getDefaultHomeHeroConfig();

    const seeded = await upsertStoreRow(initialConfig);

    return fromStoreRecord(seeded);
  } catch (error) {
    console.error("Error reading home hero config:", error);
    const legacyConfig = await readLegacyHomeHeroConfig();
    return legacyConfig || getDefaultHomeHeroConfig();
  }
}

export async function writeHomeHeroConfig(
  input: Omit<HomeHeroConfig, "updatedAt">,
): Promise<HomeHeroConfig> {
  const normalized = normalizeConfig({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  await ensureHomeHeroStoreTable();

  const saved = await upsertStoreRow(normalized);

  return fromStoreRecord(saved);
}

export function getHomeHeroCtaLabel(mode: HomeHeroCtaMode): string {
  if (mode === "article") return "مشاهده نوشته";
  if (mode === "radio") return "شنیدن رادیودات";
  if (mode === "magazine") return "خواندن مجله";
  return "";
}
