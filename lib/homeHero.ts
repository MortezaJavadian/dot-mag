import { readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export type HomeHeroCtaMode = "none" | "article" | "radio" | "magazine";

export type HomeHeroEffectPreset =
  | "none"
  | "soft-darken"
  | "soft-lighten"
  | "warm-film"
  | "subtle-blur";

export type HomeHeroBannerConfig = {
  id: string;
  badgeText: string;
  heroHtml: string;
  secondLineAsTitle: boolean;
  image: string | null;
  backgroundMobileImage: string | null;
  backgroundDesktopImage: string | null;
  effectPreset: HomeHeroEffectPreset;
  ctaMode: HomeHeroCtaMode;
  ctaTargetId: string | null;
};

export type HomeHeroConfig = {
  featuredArticleIds: string[];
  autoRotateSeconds: number;
  banners: HomeHeroBannerConfig[];
  updatedAt: string;
};

const HOME_HERO_RECORD_ID = "home";
const DEFAULT_HERO_AUTOROTATE_SECONDS = 6;
const LEGACY_HOME_HERO_FILE_PATH = join(
  process.cwd(),
  "data",
  "home-hero.json",
);

const DEFAULT_HOME_HERO_BANNER: Omit<HomeHeroBannerConfig, "id"> = {
  badgeText: "شماره جدید منتشر شد",
  heroHtml:
    '<h1>داستان\u200cهایی که<br /><span style="color: #d73b3a;">الهام\u200cبخش</span> هستند</h1><p>مجله دات، پلتفرمی برای روایت داستان\u200cهای الهام\u200cبخش از دنیای طراحی، تکنولوژی و سبک زندگی مدرن.</p>',
  secondLineAsTitle: true,
  image: null,
  backgroundMobileImage: null,
  backgroundDesktopImage: null,
  effectPreset: "none",
  ctaMode: "none",
  ctaTargetId: null,
};

const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  featuredArticleIds: [],
  autoRotateSeconds: DEFAULT_HERO_AUTOROTATE_SECONDS,
  banners: [
    {
      id: "home-banner-1",
      ...DEFAULT_HOME_HERO_BANNER,
    },
  ],
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

function isValidEffectPreset(value: string): value is HomeHeroEffectPreset {
  return (
    value === "none" ||
    value === "soft-darken" ||
    value === "soft-lighten" ||
    value === "warm-film" ||
    value === "subtle-blur"
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

function normalizeAutoRotateSeconds(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return Math.max(0, Math.floor(fallback));
}

function normalizeBannerId(value: unknown, index: number): string {
  const normalized = normalizeTextValue(value);
  if (normalized) return normalized;
  return `home-banner-${index + 1}-${randomUUID().slice(0, 8)}`;
}

type NormalizeBannerOptions = {
  strictBackgroundPair: boolean;
};

function normalizeBanner(
  value: unknown,
  index: number,
  options: NormalizeBannerOptions,
): HomeHeroBannerConfig {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const nextModeRaw = normalizeTextValue(raw.ctaMode, "none");
  const ctaMode = isValidCtaMode(nextModeRaw) ? nextModeRaw : "none";
  const ctaTargetId =
    ctaMode === "none" ? null : normalizeNullableText(raw.ctaTargetId);
  const secondLineAsTitle =
    typeof raw.secondLineAsTitle === "boolean"
      ? raw.secondLineAsTitle
      : DEFAULT_HOME_HERO_BANNER.secondLineAsTitle;

  const backgroundMobileImage = normalizeNullableText(
    raw.backgroundMobileImage,
  );
  const backgroundDesktopImage = normalizeNullableText(
    raw.backgroundDesktopImage,
  );
  const hasMobileBackground = Boolean(backgroundMobileImage);
  const hasDesktopBackground = Boolean(backgroundDesktopImage);

  if (
    options.strictBackgroundPair &&
    hasMobileBackground !== hasDesktopBackground
  ) {
    throw new Error(
      "Home hero banner background images must include both mobile and desktop variants",
    );
  }

  const normalizedBackgroundMobileImage =
    hasMobileBackground && hasDesktopBackground ? backgroundMobileImage : null;
  const normalizedBackgroundDesktopImage =
    hasMobileBackground && hasDesktopBackground ? backgroundDesktopImage : null;

  const effectPresetRaw = normalizeTextValue(raw.effectPreset, "none");
  const effectPreset = isValidEffectPreset(effectPresetRaw)
    ? effectPresetRaw
    : "none";

  return {
    id: normalizeBannerId(raw.id, index),
    badgeText: normalizeTextValue(
      raw.badgeText,
      DEFAULT_HOME_HERO_BANNER.badgeText,
    ),
    heroHtml: normalizeTextValue(
      raw.heroHtml,
      DEFAULT_HOME_HERO_BANNER.heroHtml,
    ),
    secondLineAsTitle,
    image: normalizeNullableText(raw.image),
    backgroundMobileImage: normalizedBackgroundMobileImage,
    backgroundDesktopImage: normalizedBackgroundDesktopImage,
    effectPreset,
    ctaMode,
    ctaTargetId,
  };
}

function normalizeBanners(
  value: unknown,
  options: NormalizeBannerOptions,
): HomeHeroBannerConfig[] {
  const source = Array.isArray(value) ? value : [];
  const uniqueIds = new Set<string>();
  const banners: HomeHeroBannerConfig[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeBanner(source[index], index, options);

    let bannerId = normalized.id;
    while (uniqueIds.has(bannerId)) {
      bannerId = `${bannerId}-${randomUUID().slice(0, 6)}`;
    }

    uniqueIds.add(bannerId);
    banners.push({ ...normalized, id: bannerId });
  }

  if (banners.length > 0) {
    return banners;
  }

  return [
    {
      id: "home-banner-1",
      ...DEFAULT_HOME_HERO_BANNER,
    },
  ];
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

type NormalizeConfigOptions = {
  strictBackgroundPair: boolean;
};

function normalizeConfig(
  input: unknown,
  options: NormalizeConfigOptions,
): HomeHeroConfig {
  if (!input || typeof input !== "object") {
    return {
      ...DEFAULT_HOME_HERO_CONFIG,
      banners: DEFAULT_HOME_HERO_CONFIG.banners.map((banner) => ({
        ...banner,
      })),
    };
  }

  const raw = input as Record<string, unknown>;
  const featuredArticleIds = normalizeFeaturedArticleIds(
    raw.featuredArticleIds,
  );
  const banners = normalizeBanners(raw.banners, {
    strictBackgroundPair: options.strictBackgroundPair,
  });
  const autoRotateSeconds = normalizeAutoRotateSeconds(
    raw.autoRotateSeconds,
    DEFAULT_HERO_AUTOROTATE_SECONDS,
  );

  return {
    featuredArticleIds,
    autoRotateSeconds,
    banners,
    updatedAt: normalizeTextValue(raw.updatedAt, new Date().toISOString()),
  };
}

function normalizeLegacyConfig(input: unknown): HomeHeroConfig {
  if (!input || typeof input !== "object") {
    return getDefaultHomeHeroConfig();
  }

  const raw = input as Record<string, unknown>;

  if (Array.isArray(raw.banners)) {
    return normalizeConfig(raw, { strictBackgroundPair: false });
  }

  const legacyBanner = {
    id: "home-banner-1",
    badgeText: raw.badgeText,
    heroHtml: raw.heroHtml,
    secondLineAsTitle: raw.secondLineAsTitle,
    image: raw.image,
    backgroundMobileImage: null,
    backgroundDesktopImage: null,
    effectPreset: "none",
    ctaMode: raw.ctaMode,
    ctaTargetId: raw.ctaTargetId,
  };

  return normalizeConfig(
    {
      featuredArticleIds: raw.featuredArticleIds,
      autoRotateSeconds: raw.autoRotateSeconds,
      banners: [legacyBanner],
      updatedAt: raw.updatedAt,
    },
    { strictBackgroundPair: false },
  );
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
      "autoRotateSeconds" INTEGER NOT NULL DEFAULT 6,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "HomeHeroConfigStore"
    ADD COLUMN IF NOT EXISTS "autoRotateSeconds" INTEGER NOT NULL DEFAULT 6;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HomeHeroBanner" (
      "id" TEXT PRIMARY KEY,
      "storeId" TEXT NOT NULL REFERENCES "HomeHeroConfigStore"("id") ON DELETE CASCADE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "badgeText" TEXT NOT NULL,
      "heroHtml" TEXT NOT NULL,
      "secondLineAsTitle" BOOLEAN NOT NULL DEFAULT TRUE,
      "image" TEXT,
      "backgroundMobileImage" TEXT,
      "backgroundDesktopImage" TEXT,
      "effectPreset" TEXT NOT NULL DEFAULT 'none',
      "ctaMode" TEXT NOT NULL DEFAULT 'none',
      "ctaTargetId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "HomeHeroBanner_storeId_sortOrder_idx"
    ON "HomeHeroBanner" ("storeId", "sortOrder");
  `);
}

async function readLegacyHomeHeroConfig(): Promise<HomeHeroConfig | null> {
  try {
    const content = await readFile(LEGACY_HOME_HERO_FILE_PATH, "utf-8");
    return normalizeLegacyConfig(JSON.parse(content));
  } catch {
    return null;
  }
}

function toStorePayload(config: HomeHeroConfig) {
  const firstBanner = config.banners[0] || {
    id: "home-banner-1",
    ...DEFAULT_HOME_HERO_BANNER,
  };

  return {
    badgeText: firstBanner.badgeText,
    heroHtml: firstBanner.heroHtml,
    secondLineAsTitle: firstBanner.secondLineAsTitle,
    featuredArticleIds: config.featuredArticleIds,
    image: firstBanner.image,
    ctaMode: firstBanner.ctaMode,
    ctaTargetId: firstBanner.ctaTargetId,
    autoRotateSeconds: config.autoRotateSeconds,
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
  autoRotateSeconds: unknown;
  updatedAt: unknown;
};

type HomeHeroBannerRow = {
  id: string;
  sortOrder: number;
  badgeText: string;
  heroHtml: string;
  secondLineAsTitle: boolean;
  image: string | null;
  backgroundMobileImage: string | null;
  backgroundDesktopImage: string | null;
  effectPreset: string;
  ctaMode: string;
  ctaTargetId: string | null;
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
        "autoRotateSeconds",
        "updatedAt"
      FROM "HomeHeroConfigStore"
      WHERE "id" = $1
      LIMIT 1
    `,
    HOME_HERO_RECORD_ID,
  );

  return rows[0] || null;
}

async function readBannerRows(): Promise<HomeHeroBannerRow[]> {
  const rows = await prisma.$queryRawUnsafe<HomeHeroBannerRow[]>(
    `
      SELECT
        "id",
        "sortOrder",
        "badgeText",
        "heroHtml",
        "secondLineAsTitle",
        "image",
        "backgroundMobileImage",
        "backgroundDesktopImage",
        "effectPreset",
        "ctaMode",
        "ctaTargetId"
      FROM "HomeHeroBanner"
      WHERE "storeId" = $1
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `,
    HOME_HERO_RECORD_ID,
  );

  return rows;
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
        "autoRotateSeconds",
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
        $9,
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
        "autoRotateSeconds" = EXCLUDED."autoRotateSeconds",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING
        "badgeText",
        "heroHtml",
        "secondLineAsTitle",
        "featuredArticleIds",
        "image",
        "ctaMode",
        "ctaTargetId",
        "autoRotateSeconds",
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
    payload.autoRotateSeconds,
  );

  const saved = rows[0];
  if (!saved) {
    throw new Error("Home hero config upsert did not return a record");
  }

  return saved;
}

async function replaceBannerRows(
  banners: HomeHeroBannerConfig[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `DELETE FROM "HomeHeroBanner" WHERE "storeId" = $1`,
      HOME_HERO_RECORD_ID,
    );

    for (let index = 0; index < banners.length; index += 1) {
      const banner = banners[index];

      await tx.$executeRawUnsafe(
        `
          INSERT INTO "HomeHeroBanner" (
            "id",
            "storeId",
            "sortOrder",
            "badgeText",
            "heroHtml",
            "secondLineAsTitle",
            "image",
            "backgroundMobileImage",
            "backgroundDesktopImage",
            "effectPreset",
            "ctaMode",
            "ctaTargetId",
            "updatedAt"
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            CURRENT_TIMESTAMP
          )
        `,
        banner.id,
        HOME_HERO_RECORD_ID,
        index,
        banner.badgeText,
        banner.heroHtml,
        banner.secondLineAsTitle,
        banner.image,
        banner.backgroundMobileImage,
        banner.backgroundDesktopImage,
        banner.effectPreset,
        banner.ctaMode,
        banner.ctaTargetId,
      );
    }
  });
}

function fromBannerStoreRecord(
  record: HomeHeroBannerRow,
): HomeHeroBannerConfig {
  return normalizeBanner(record, record.sortOrder, {
    strictBackgroundPair: false,
  });
}

function createLegacyBannerFromStore(
  record: HomeHeroStoreRow,
): HomeHeroBannerConfig {
  return normalizeBanner(
    {
      id: "home-banner-1",
      badgeText: record.badgeText,
      heroHtml: record.heroHtml,
      secondLineAsTitle: record.secondLineAsTitle,
      image: record.image,
      backgroundMobileImage: null,
      backgroundDesktopImage: null,
      effectPreset: "none",
      ctaMode: record.ctaMode,
      ctaTargetId: record.ctaTargetId,
    },
    0,
    { strictBackgroundPair: false },
  );
}

function fromStoreRecord(
  record: HomeHeroStoreRow,
  banners: HomeHeroBannerConfig[],
): HomeHeroConfig {
  return normalizeConfig(
    {
      featuredArticleIds: record.featuredArticleIds,
      autoRotateSeconds: record.autoRotateSeconds,
      banners,
      updatedAt: normalizeUpdatedAt(record.updatedAt),
    },
    { strictBackgroundPair: false },
  );
}

export function getDefaultHomeHeroConfig(): HomeHeroConfig {
  return {
    ...DEFAULT_HOME_HERO_CONFIG,
    banners: DEFAULT_HOME_HERO_CONFIG.banners.map((banner) => ({ ...banner })),
  };
}

export async function readHomeHeroConfig(): Promise<HomeHeroConfig> {
  try {
    await ensureHomeHeroStoreTable();

    const existing = await readStoreRow();

    if (existing) {
      const storedBanners = await readBannerRows();

      if (storedBanners.length > 0) {
        return fromStoreRecord(
          existing,
          storedBanners.map((banner) => fromBannerStoreRecord(banner)),
        );
      }

      const migratedBanner = createLegacyBannerFromStore(existing);
      await replaceBannerRows([migratedBanner]);

      return fromStoreRecord(existing, [migratedBanner]);
    }

    const legacyConfig = await readLegacyHomeHeroConfig();
    const initialConfig = legacyConfig || getDefaultHomeHeroConfig();

    const seeded = await upsertStoreRow(initialConfig);
    await replaceBannerRows(initialConfig.banners);

    return fromStoreRecord(seeded, initialConfig.banners);
  } catch (error) {
    console.error("Error reading home hero config:", error);
    const legacyConfig = await readLegacyHomeHeroConfig();
    return legacyConfig || getDefaultHomeHeroConfig();
  }
}

export async function writeHomeHeroConfig(
  input: Omit<HomeHeroConfig, "updatedAt">,
): Promise<HomeHeroConfig> {
  const normalized = normalizeConfig(
    {
      ...input,
      updatedAt: new Date().toISOString(),
    },
    { strictBackgroundPair: true },
  );

  if (normalized.banners.length < 1) {
    throw new Error("At least one home hero banner is required");
  }

  await ensureHomeHeroStoreTable();

  const saved = await upsertStoreRow(normalized);
  await replaceBannerRows(normalized.banners);

  const bannerRows = await readBannerRows();
  const banners = bannerRows.map((banner) => fromBannerStoreRecord(banner));

  return fromStoreRecord(saved, banners);
}

export function getHomeHeroCtaLabel(mode: HomeHeroCtaMode): string {
  if (mode === "article") return "مشاهده نوشته";
  if (mode === "radio") return "شنیدن رادیودات";
  if (mode === "magazine") return "خواندن مجله";
  return "";
}
