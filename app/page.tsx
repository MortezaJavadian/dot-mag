import Link from "next/link";
import { ArticleCard } from "@/components/feature/ArticleCard";
import { RadioCard } from "@/components/feature/RadioCard";
import { toSafeArticleHtml } from "@/lib/articleContent";
import { getHomeHeroCtaLabel, readHomeHeroConfig } from "@/lib/homeHero";
import { getUploadUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type HomeArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  publishedAt: string;
  featured: boolean;
  tags?: { id: string; name: string; slug: string }[];
};

type HomeMagazine = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  cover: string | null;
};

type HomeRadio = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  cover: string | null;
  publishedAt: string;
  durationSec: number | null;
  segments: { id: string }[];
};

function resolveHeroCta(
  ctaMode: "none" | "article" | "radio" | "magazine",
  ctaTargetId: string | null,
  articles: HomeArticle[],
  magazines: HomeMagazine[],
  radios: HomeRadio[],
) {
  if (ctaMode === "none") return null;

  if (ctaMode === "article") {
    const target =
      articles.find(
        (item) => item.id === ctaTargetId || item.slug === ctaTargetId,
      ) || articles[0];
    return {
      href: target ? `/posts/${target.slug}` : "/posts",
      label: getHomeHeroCtaLabel("article"),
    };
  }

  if (ctaMode === "radio") {
    const target =
      radios.find(
        (item) => item.id === ctaTargetId || item.slug === ctaTargetId,
      ) || radios[0];
    return {
      href: target ? `/radio/${target.slug}` : "/radio",
      label: getHomeHeroCtaLabel("radio"),
    };
  }

  if (ctaMode === "magazine") {
    const target =
      magazines.find(
        (item) => item.id === ctaTargetId || item.slug === ctaTargetId,
      ) || magazines[0];
    return {
      href: target ? `/archive/${target.slug}` : "/archive",
      label: getHomeHeroCtaLabel("magazine"),
    };
  }

  return null;
}

function applySecondLineMode(html: string, secondLineAsTitle: boolean): string {
  const headingPattern = /<h1([^>]*)>([\s\S]*?)<\/h1>/i;
  const match = html.match(headingPattern);
  if (!match) return html;

  const headingAttributes = match[1] || "";
  const headingInner = match[2] || "";
  const brMatch = headingInner.match(/<br\s*\/?\s*>/i);
  if (!brMatch || brMatch.index === undefined) return html;

  const splitIndex = brMatch.index + brMatch[0].length;
  const firstLine = headingInner.slice(0, splitIndex);
  const secondLineRaw = headingInner
    .slice(splitIndex)
    .replace(
      /<span class="hero-line-two-(strong|normal)">([\s\S]*?)<\/span>/gi,
      "$2",
    )
    .trim();

  if (!secondLineRaw) return html;

  const secondLineClass = secondLineAsTitle
    ? "hero-line-two-strong"
    : "hero-line-two-normal";

  const rebuiltHeading = `<h1${headingAttributes}>${firstLine}<span class="${secondLineClass}">${secondLineRaw}</span></h1>`;

  return html.replace(headingPattern, rebuiltHeading);
}

function stabilizeRtlSentenceEnding(html: string): string {
  return html.replace(/([.!?؟])(?=\s*<\/p>)/g, "$1\u200f");
}

const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL?.trim() || "http://127.0.0.1:3000";

async function fetchHomeCollection<T>(
  path: string,
  tags: string[] = [],
): Promise<T[]> {
  try {
    const res = await fetch(`${INTERNAL_API_BASE_URL}${path}`, {
      next: tags.length ? { revalidate: 60, tags } : { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

async function getArticles(): Promise<HomeArticle[]> {
  return fetchHomeCollection<HomeArticle>("/api/articles");
}

async function getMagazines(): Promise<HomeMagazine[]> {
  return fetchHomeCollection<HomeMagazine>("/api/magazines", ["magazines"]);
}

async function getRadios(): Promise<HomeRadio[]> {
  return fetchHomeCollection<HomeRadio>("/api/radios", ["radios"]);
}

export default async function HomePage() {
  const [articles, magazines, radios, homeHeroConfig] = await Promise.all([
    getArticles(),
    getMagazines(),
    getRadios(),
    readHomeHeroConfig(),
  ]);

  const selectedHomeFeaturedArticles = homeHeroConfig.featuredArticleIds
    .map((articleId) =>
      articles.find(
        (article) => article.id === articleId || article.slug === articleId,
      ),
    )
    .filter((article): article is HomeArticle => Boolean(article));
  const curatedHomeFeaturedArticles =
    selectedHomeFeaturedArticles.length > 0
      ? selectedHomeFeaturedArticles
      : articles.slice(0, 3);
  const latestRadios = radios.slice(0, 3);
  const heroBadge = homeHeroConfig.badgeText.trim();
  const safeHeroHtml = stabilizeRtlSentenceEnding(
    applySecondLineMode(
      toSafeArticleHtml(homeHeroConfig.heroHtml),
      homeHeroConfig.secondLineAsTitle,
    ),
  );
  const heroImage = getUploadUrl(homeHeroConfig.image || "");
  const heroCta = resolveHeroCta(
    homeHeroConfig.ctaMode,
    homeHeroConfig.ctaTargetId,
    articles,
    magazines,
    radios,
  );

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-bl from-cream/30 via-background to-background">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-forest/10 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-5 lg:[direction:ltr]">
            <div className="order-1 lg:order-1 animate-fade-in">
              <div className="mx-auto my-1 lg:my-2 w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[80%]">
                <div className="image-frame-shell">
                  <div className="image-frame-inner">
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt="تصویر هدر خانه"
                        className="image-frame-media object-cover"
                      />
                    ) : (
                      <div className="min-h-[280px] sm:min-h-[340px] lg:min-h-[460px] flex items-center justify-center bg-cream text-foreground-secondary px-6 text-center">
                        تصویر هدر از پنل ادمین قابل تنظیم است
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-2 lg:order-2 animate-slide-up text-right lg:justify-self-end lg:w-full lg:max-w-none lg:pr-[2.25rem]">
              {heroBadge && (
                <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                  {heroBadge}
                </span>
              )}

              <div
                className="max-w-2xl lg:ml-auto [&_h1]:!text-right [&_h1]:text-4xl md:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:mb-6 [&_p]:!text-right [&_p]:[unicode-bidi:plaintext] [&_p]:text-lg md:[&_p]:text-xl [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_.hero-line-two-strong]:block [&_.hero-line-two-strong]:font-black [&_.hero-line-two-strong]:!text-right [&_.hero-line-two-normal]:block [&_.hero-line-two-normal]:text-lg md:[&_.hero-line-two-normal]:text-xl [&_.hero-line-two-normal]:font-normal [&_.hero-line-two-normal]:leading-relaxed [&_.hero-line-two-normal]:!text-right"
                dangerouslySetInnerHTML={{ __html: safeHeroHtml }}
              />

              {heroCta && (
                <div className="mt-8">
                  <Link
                    href={heroCta.href}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="rotate-180 shrink-0"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span>{heroCta.label}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {curatedHomeFeaturedArticles.length > 0 && (
        <section className="section-spacing bg-background-secondary">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">
                نوشته‌های برگزیده
              </h2>
              <Link
                href="/posts"
                className="text-primary font-medium hover:underline"
              >
                مشاهده همه ←
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curatedHomeFeaturedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {latestRadios.length > 0 && (
        <section className="section-spacing">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">آخرین رادیودات</h2>
              <Link
                href="/radio"
                className="text-primary font-medium hover:underline"
              >
                مشاهده همه ←
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestRadios.map((radio) => (
                <RadioCard key={radio.id} radio={radio} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
