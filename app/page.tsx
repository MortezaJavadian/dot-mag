import Link from "next/link";
import { ArticleCard } from "@/components/feature/ArticleCard";
import { RadioCard } from "@/components/feature/RadioCard";
import { toSafeArticleHtml } from "@/lib/articleContent";
import { getHomeHeroCtaLabel, readHomeHeroConfig } from "@/lib/homeHero";
import { getUploadUrl } from "@/lib/uploads";

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
      articles.find((item) => item.id === ctaTargetId) || articles[0];
    if (!target) return null;

    return {
      href: `/posts/${target.slug}`,
      label: getHomeHeroCtaLabel("article"),
    };
  }

  if (ctaMode === "radio") {
    const target = radios.find((item) => item.id === ctaTargetId) || radios[0];
    if (!target) return null;

    return {
      href: `/radio/${target.slug}`,
      label: getHomeHeroCtaLabel("radio"),
    };
  }

  if (ctaMode === "magazine") {
    const target =
      magazines.find((item) => item.id === ctaTargetId) || magazines[0];
    if (!target) return null;

    return {
      href: `/archive/${target.slug}`,
      label: getHomeHeroCtaLabel("magazine"),
    };
  }

  return null;
}

async function getArticles(): Promise<HomeArticle[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/articles`,
      {
        next: { revalidate: 60 },
      },
    );
    return await res.json();
  } catch {
    return [];
  }
}

async function getMagazines(): Promise<HomeMagazine[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/magazines`,
      {
        next: { revalidate: 60, tags: ["magazines"] },
      },
    );
    return await res.json();
  } catch {
    return [];
  }
}

async function getRadios(): Promise<HomeRadio[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/radios`,
      {
        next: { revalidate: 60, tags: ["radios"] },
      },
    );
    return await res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [articles, magazines, radios, homeHeroConfig] = await Promise.all([
    getArticles(),
    getMagazines(),
    getRadios(),
    readHomeHeroConfig(),
  ]);

  const featuredArticles = articles.filter((article) => article.featured);
  const latestArticles = articles.slice(0, 6);
  const latestRadios = radios.slice(0, 3);
  const heroBadge = homeHeroConfig.badgeText.trim();
  const safeHeroHtml = toSafeArticleHtml(homeHeroConfig.heroHtml);
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
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-12">
            <div className="order-1 lg:order-1 animate-fade-in">
              <div className="mx-auto my-3 lg:my-6 w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[80%]">
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

            <div className="order-2 lg:order-2 animate-slide-up text-right">
              {heroBadge && (
                <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                  {heroBadge}
                </span>
              )}

              <div
                className="max-w-2xl [&_h1]:text-4xl md:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:mb-6 [&_p]:text-lg md:[&_p]:text-xl [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: safeHeroHtml }}
              />

              {heroCta && (
                <div className="mt-8">
                  <Link
                    href={heroCta.href}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105"
                  >
                    {heroCta.label}
                    <span aria-hidden className="text-xl leading-none">
                      {">"}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Section */}
      <section className="section-spacing bg-background-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block w-12 h-1 bg-primary rounded-full mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-6">سخن سردبیر</h2>
            <p className="text-lg md:text-xl text-foreground-secondary leading-relaxed">
              در دنیایی که همه چیز با سرعت در حال تغییر است، ما به دنبال لحظه‌ای
              مکث هستیم. لحظه‌ای برای دیدن زیبایی در جزئیات، برای شنیدن
              داستان‌های الهام‌بخش، و برای کشف ایده‌های نو. مجله دات، دعوتی است
              به این سفر.
            </p>
            <p className="mt-6 text-khaki font-medium">— تیم مجله دات</p>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="section-spacing">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">نوشته‌های ویژه</h2>
              <Link
                href="/posts"
                className="text-primary font-medium hover:underline hidden md:block"
              >
                مشاهده همه ←
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.slice(0, 2).map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="featured"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles */}
      <section className="section-spacing bg-background-secondary">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">آخرین نوشته‌ها</h2>
            <Link
              href="/posts"
              className="text-primary font-medium hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

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

      {/* CTA Section */}
      <section className="section-spacing">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-deep-black text-white p-8 md:p-16">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                آرشیو مجله را کاوش کنید
              </h2>
              <p className="text-white/70 text-lg mb-8">
                تمام شماره‌های مجله دات را به صورت آنلاین مطالعه کنید. بدون نیاز
                به دانلود، مستقیماً در مرورگر.
              </p>
              <Link
                href="/archive"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-deep-black font-bold rounded-full hover:bg-cream transition-colors"
              >
                ورود به آرشیو
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
                  className="rotate-180"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>

            {/* Decorative */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-forest/20 rounded-full blur-3xl" />
          </div>
        </div>
      </section>
    </>
  );
}
