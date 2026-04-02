import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

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

const HOME_HERO_FILE_PATH = join(process.cwd(), "data", "home-hero.json");

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

export function getDefaultHomeHeroConfig(): HomeHeroConfig {
  return { ...DEFAULT_HOME_HERO_CONFIG };
}

export async function readHomeHeroConfig(): Promise<HomeHeroConfig> {
  try {
    const content = await readFile(HOME_HERO_FILE_PATH, "utf-8");
    return normalizeConfig(JSON.parse(content));
  } catch {
    return getDefaultHomeHeroConfig();
  }
}

export async function writeHomeHeroConfig(
  input: Omit<HomeHeroConfig, "updatedAt">,
): Promise<HomeHeroConfig> {
  const normalized = normalizeConfig({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  await mkdir(dirname(HOME_HERO_FILE_PATH), { recursive: true });
  await writeFile(
    HOME_HERO_FILE_PATH,
    JSON.stringify(normalized, null, 2),
    "utf-8",
  );

  return normalized;
}

export function getHomeHeroCtaLabel(mode: HomeHeroCtaMode): string {
  if (mode === "article") return "مشاهده نوشته";
  if (mode === "radio") return "شنیدن رادیودات";
  if (mode === "magazine") return "خواندن مجله";
  return "";
}
