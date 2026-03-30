import Link from "next/link";
import { ArticleCard } from "@/components/feature/ArticleCard";
import { getUploadUrl } from "@/lib/uploads";

async function getArticles() {
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

async function getMagazines() {
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

export default async function HomePage() {
  const [articles, magazines] = await Promise.all([
    getArticles(),
    getMagazines(),
  ]);

  const featuredArticles = articles.filter((a: any) => a.featured);
  const latestArticles = articles.slice(0, 6);
  const latestMagazine = magazines[0];
  const latestMagazineCover = getUploadUrl(latestMagazine?.cover);

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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                شماره جدید منتشر شد
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
                داستان‌هایی که
                <br />
                <span className="text-primary">الهام‌بخش</span> هستند
              </h1>
              <p className="text-lg md:text-xl text-foreground-secondary max-w-lg mb-8 leading-relaxed">
                مجله دات، پلتفرمی برای روایت داستان‌های الهام‌بخش از دنیای
                طراحی، تکنولوژی و سبک زندگی مدرن.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/archive"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105"
                >
                  مشاهده مجله
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
                <Link
                  href="/posts"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-foreground/5 text-foreground font-bold rounded-full hover:bg-foreground/10 transition-all"
                >
                  نوشتار
                </Link>
              </div>
            </div>

            {/* Latest Magazine Preview */}
            <div className="hidden lg:block animate-fade-in delay-300">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-forest/20 rounded-3xl blur-2xl" />
                <div className="relative bg-card-bg rounded-2xl p-8 border border-card-border shadow-2xl">
                  <div className="aspect-[3/4] bg-cream rounded-xl mb-6 flex items-center justify-center text-foreground-secondary overflow-hidden">
                    {latestMagazineCover ? (
                      <img
                        src={latestMagazineCover}
                        alt="جلد مجله"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-24 h-32 mx-auto bg-khaki/20 rounded-lg mb-4 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-khaki"
                          >
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                          </svg>
                        </div>
                        <p className="text-sm">
                          جلد مجله {latestMagazine?.title}
                        </p>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {latestMagazine?.title}
                  </h3>
                  <p className="text-foreground-secondary text-sm mb-4">
                    {latestMagazine?.subtitle}
                  </p>
                  <Link
                    href={`/archive/${latestMagazine?.slug}`}
                    className="text-primary font-medium hover:underline"
                  >
                    مطالعه مجله ←
                  </Link>
                </div>
              </div>
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
              <h2 className="text-2xl md:text-3xl font-bold">نوشتار ویژه</h2>
              <Link
                href="/posts"
                className="text-primary font-medium hover:underline hidden md:block"
              >
                مشاهده همه ←
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.slice(0, 2).map((article: any) => (
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
            <h2 className="text-2xl md:text-3xl font-bold">آخرین نوشتار</h2>
            <Link
              href="/posts"
              className="text-primary font-medium hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestArticles.map((article: any) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </section>

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
