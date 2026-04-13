import Link from "next/link";
import { ArticleCard } from "@/components/feature/ArticleCard";
import HomeHeroCarousel, {
  type HomeHeroCarouselSlide,
} from "@/components/feature/HomeHeroCarousel";
import { RadioCard } from "@/components/feature/RadioCard";
import { fetchInternalArray } from "@/lib/internalApi";
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

  const headingLines = extractNormalizedHeroLines(headingInner);
  const firstLine = headingLines[0] || "";
  const secondLineRaw = headingLines[1] || "";
  const overflowLines = headingLines.slice(2);

  if (!firstLine) return html;

  const secondLineClass = secondLineAsTitle
    ? "hero-line-two-strong"
    : "hero-line-two-normal";

  const rebuiltHeading = `<h1${headingAttributes}><span class="hero-line-one-strong">${firstLine}</span>${
    secondLineRaw
      ? `<span class="${secondLineClass}">${secondLineRaw}</span>`
      : ""
  }</h1>`;

  const overflowParagraph = overflowLines.length
    ? `<p>${overflowLines.join("<br />")}</p>`
    : "";

  return html.replace(headingPattern, `${rebuiltHeading}${overflowParagraph}`);
}

function stripHeroLineClassWrappers(value: string): string {
  return value.replace(
    /<span class="hero-line-(one-strong|two-strong|two-normal)">([\s\S]*?)<\/span>/gi,
    "$2",
  );
}

function stripOuterBlockTag(value: string): string {
  let next = value.trim();
  let previous = "";

  while (next !== previous) {
    previous = next;
    next = next
      .replace(/^<(p|h1|h2|h3|h4|h5|h6)([^>]*)>\s*/i, "")
      .replace(/\s*<\/(p|h1|h2|h3|h4|h5|h6)>$/i, "")
      .trim();
  }

  return next;
}

function isMeaningfulHtmlLine(value: string): boolean {
  const plain = value
    .replace(/<br\s*\/?\s*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u200c/g, "")
    .trim();

  return plain.length > 0;
}

function extractNormalizedHeroLines(value: string): string[] {
  return stripHeroLineClassWrappers(value)
    .split(/<br\s*\/?\s*>/gi)
    .map((line) => stripOuterBlockTag(line))
    .map((line) => line.trim())
    .filter((line) => isMeaningfulHtmlLine(line));
}

function normalizeHeroHeadingStructure(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  if (!/<[^>]+>/.test(trimmed)) {
    return `<h1>${trimmed}</h1>`;
  }

  const blockPattern = /<(h1|p)([^>]*)>([\s\S]*?)<\/\1>/gi;
  const blocks: Array<{
    tag: "h1" | "p";
    attrs: string;
    inner: string;
    start: number;
    end: number;
    lines: string[];
    blockIndex: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(trimmed)) !== null) {
    const lines = extractNormalizedHeroLines(match[3] || "");
    blocks.push({
      tag: match[1] as "h1" | "p",
      attrs: match[2] || "",
      inner: match[3] || "",
      start: match.index,
      end: match.index + match[0].length,
      lines,
      blockIndex: blocks.length,
    });

    if (blocks.length >= 8) break;
  }

  if (!blocks.length) {
    return `<h1>${trimmed}</h1>`;
  }

  const meaningfulBlocks = blocks.filter((block) => block.lines.length > 0);
  if (!meaningfulBlocks.length) {
    return trimmed;
  }

  const first = meaningfulBlocks[0];
  const firstLine = first.lines[0] || "";
  if (!firstLine) {
    return trimmed;
  }

  let secondLine = first.lines[1] || "";
  const overflowLines: string[] = [];
  if (first.lines.length > 2) {
    overflowLines.push(...first.lines.slice(2));
  }

  let consumedSecondBlock: (typeof meaningfulBlocks)[number] | null = null;
  if (!secondLine) {
    const secondCandidate = meaningfulBlocks.find(
      (block) => block.blockIndex > first.blockIndex,
    );

    if (secondCandidate) {
      secondLine = secondCandidate.lines[0] || "";
      if (secondCandidate.lines.length > 1) {
        overflowLines.push(...secondCandidate.lines.slice(1));
      }
      consumedSecondBlock = secondCandidate;
    }
  }

  const headingAttrs = first.tag === "h1" ? first.attrs : "";
  const mergedHeading = `<h1${headingAttrs}>${firstLine}${
    secondLine ? `<br />${secondLine}` : ""
  }</h1>`;
  const overflowParagraph = overflowLines.length
    ? `<p>${overflowLines.join("<br />")}</p>`
    : "";
  const replacement = `${mergedHeading}${overflowParagraph}`;

  if (!consumedSecondBlock) {
    return `${trimmed.slice(0, first.start)}${replacement}${trimmed.slice(first.end)}`.trim();
  }

  return `${trimmed.slice(0, first.start)}${replacement}${trimmed.slice(first.end, consumedSecondBlock.start)}${trimmed.slice(consumedSecondBlock.end)}`.trim();
}

function stabilizeRtlSentenceEnding(html: string): string {
  return html.replace(/([.!?؟])(?=\s*<\/p>)/g, "$1\u200f");
}

function getHeroEffectClassName(
  effectPreset: HomeHeroCarouselSlide["effectPreset"],
): string {
  if (effectPreset === "soft-darken") return "hero-bg-effect-soft-darken";
  if (effectPreset === "soft-lighten") return "hero-bg-effect-soft-lighten";
  if (effectPreset === "warm-film") return "hero-bg-effect-warm-film";
  if (effectPreset === "subtle-blur") return "hero-bg-effect-subtle-blur";
  return "hero-bg-effect-none";
}

async function getArticles(): Promise<HomeArticle[]> {
  return fetchInternalArray<HomeArticle>("/api/articles?mode=summary", {
    revalidate: 60,
    timeoutMs: 5000,
  });
}

async function getMagazines(): Promise<HomeMagazine[]> {
  return fetchInternalArray<HomeMagazine>("/api/magazines?mode=summary", {
    revalidate: 60,
    tags: ["magazines"],
    timeoutMs: 5000,
  });
}

async function getRadios(): Promise<HomeRadio[]> {
  return fetchInternalArray<HomeRadio>("/api/radios?mode=summary", {
    revalidate: 60,
    tags: ["radios"],
    timeoutMs: 5000,
  });
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
  const rawHeroSlides: HomeHeroCarouselSlide[] = homeHeroConfig.banners.map(
    (banner) => {
      const normalizedHeroHtml = normalizeHeroHeadingStructure(
        toSafeArticleHtml(banner.heroHtml),
      );

      return {
        id: banner.id,
        badgeText: banner.badgeText.trim(),
        safeHeroHtml: stabilizeRtlSentenceEnding(
          applySecondLineMode(normalizedHeroHtml, banner.secondLineAsTitle),
        ),
        frameImage: getUploadUrl(banner.image || ""),
        backgroundMobileImage: getUploadUrl(banner.backgroundMobileImage || ""),
        backgroundDesktopImage: getUploadUrl(
          banner.backgroundDesktopImage || "",
        ),
        effectPreset: banner.effectPreset,
        cta: resolveHeroCta(
          banner.ctaMode,
          banner.ctaTargetId,
          articles,
          magazines,
          radios,
        ),
      };
    },
  );

  const fallbackHeroSlide =
    rawHeroSlides.find(
      (slide) =>
        Boolean(slide.badgeText.trim()) ||
        Boolean(slide.safeHeroHtml.trim()) ||
        Boolean(slide.frameImage) ||
        Boolean(slide.cta) ||
        Boolean(slide.backgroundMobileImage && slide.backgroundDesktopImage),
    ) || rawHeroSlides[0];

  const heroSlides: HomeHeroCarouselSlide[] = rawHeroSlides.map((slide) => {
    const isUnconfiguredSlide =
      !slide.badgeText.trim() &&
      !slide.safeHeroHtml.trim() &&
      !slide.frameImage &&
      !slide.backgroundMobileImage &&
      !slide.backgroundDesktopImage &&
      !slide.cta;

    if (isUnconfiguredSlide && fallbackHeroSlide) {
      return {
        ...slide,
        badgeText: fallbackHeroSlide.badgeText,
        safeHeroHtml: fallbackHeroSlide.safeHeroHtml,
        frameImage: fallbackHeroSlide.frameImage,
        backgroundMobileImage: fallbackHeroSlide.backgroundMobileImage,
        backgroundDesktopImage: fallbackHeroSlide.backgroundDesktopImage,
        effectPreset: fallbackHeroSlide.effectPreset,
        cta: fallbackHeroSlide.cta,
      };
    }

    return {
      ...slide,
      safeHeroHtml:
        slide.safeHeroHtml.trim() || fallbackHeroSlide?.safeHeroHtml || "",
    };
  });

  const heroSlide = heroSlides[0] || null;
  const hasMultipleHeroSlides = heroSlides.length > 1;
  const singleHeroBackground =
    heroSlide?.backgroundMobileImage && heroSlide?.backgroundDesktopImage
      ? {
          mobile: heroSlide.backgroundMobileImage,
          desktop: heroSlide.backgroundDesktopImage,
        }
      : null;

  return (
    <>
      {/* Hero Section */}
      {hasMultipleHeroSlides ? (
        <HomeHeroCarousel
          slides={heroSlides}
          autoRotateSeconds={homeHeroConfig.autoRotateSeconds}
        />
      ) : heroSlide ? (
        <section className="relative min-h-[90vh] flex items-center bg-gradient-to-bl from-cream/30 via-background to-background">
          {singleHeroBackground && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <picture>
                <source
                  media="(min-width: 1024px)"
                  srcSet={singleHeroBackground.desktop}
                />
                <img
                  src={singleHeroBackground.mobile}
                  alt=""
                  aria-hidden="true"
                  className="hero-bg-media"
                />
              </picture>
              <div
                className={`hero-bg-effect ${getHeroEffectClassName(
                  heroSlide.effectPreset,
                )}`}
              />
            </div>
          )}

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-forest/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative z-10">
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-5 lg:[direction:ltr]">
              <div className="order-1 lg:order-1 animate-fade-in">
                <div className="mx-auto my-[0.375rem] lg:my-2 w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[80%]">
                  <div className="image-frame-shell home-hero-frame-shell">
                    <div className="image-frame-inner">
                      {heroSlide.frameImage ? (
                        <img
                          src={heroSlide.frameImage}
                          alt="تصویر هدر خانه"
                          className="image-frame-media home-hero-frame-media object-cover"
                        />
                      ) : (
                        <div className="h-full min-h-[280px] sm:min-h-[340px] lg:min-h-[460px] flex items-center justify-center bg-cream text-foreground-secondary px-6 text-center">
                          تصویر هدر از پنل ادمین قابل تنظیم است
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-2 lg:order-2 animate-slide-up text-right lg:justify-self-end lg:w-full lg:max-w-none lg:pr-[2.25rem]">
                {heroSlide.badgeText && (
                  <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                    {heroSlide.badgeText}
                  </span>
                )}

                <div
                  className="max-w-2xl lg:ml-auto [&_h1]:!text-right [&_h1]:text-4xl md:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:mb-6 [&_p]:!text-right [&_p]:[unicode-bidi:plaintext] [&_p]:text-lg md:[&_p]:text-xl [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_.hero-line-one-strong]:block [&_.hero-line-one-strong]:font-black [&_.hero-line-one-strong]:!text-right [&_.hero-line-two-strong]:block [&_.hero-line-two-strong]:font-black [&_.hero-line-two-strong]:!text-right [&_.hero-line-two-normal]:block [&_.hero-line-two-normal]:text-lg md:[&_.hero-line-two-normal]:text-xl [&_.hero-line-two-normal]:font-normal [&_.hero-line-two-normal]:leading-relaxed [&_.hero-line-two-normal]:!text-right"
                  dangerouslySetInnerHTML={{ __html: heroSlide.safeHeroHtml }}
                />

                {heroSlide.cta && (
                  <div className="mt-8 mb-8 lg:mb-0">
                    <Link
                      href={heroSlide.cta.href}
                      scroll={true}
                      className="inline-flex flex-row items-center gap-3 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105 [direction:ltr]"
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
                      <span className="[direction:rtl]">
                        {heroSlide.cta.label}
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

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
              {curatedHomeFeaturedArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
                >
                  <ArticleCard article={article} />
                </div>
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
              {latestRadios.map((radio, index) => (
                <div
                  key={radio.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
                >
                  <RadioCard radio={radio} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
