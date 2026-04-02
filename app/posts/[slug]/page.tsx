import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/feature/ArticleCard";
import { prisma } from "@/lib/prisma";
import { getUploadUrl } from "@/lib/uploads";
import { toPlainText, toSafeArticleHtml } from "@/lib/articleContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ArticleTag {
  id: string;
  name: string;
  slug: string;
}

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  publishedAt: string;
  sortDate: Date;
  readingTime?: number | null;
  tags: ArticleTag[];
}

async function getArticles(): Promise<ArticleItem[]> {
  try {
    return await prisma.article.findMany({
      include: { tags: true },
      orderBy: { sortDate: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch articles for post page:", error);
    return [];
  }
}

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[^\S\r\n]+/g, " ")
    .trim()
    .toLowerCase();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(decodeSlug(rawSlug));
  const articles = await getArticles();
  const article = articles.find(
    (a) => normalizeSlug(decodeSlug(a.slug)) === slug,
  );

  if (!article) {
    return { title: "مقاله یافت نشد" };
  }

  const plainExcerpt = toPlainText(article.excerpt);

  return {
    title: article.title,
    description: plainExcerpt || article.title,
    openGraph: {
      title: article.title,
      description: plainExcerpt || article.title,
      type: "article",
      publishedTime: article.sortDate.toISOString(),
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(decodeSlug(rawSlug));
  const articles = await getArticles();
  const article = articles.find(
    (a) => normalizeSlug(decodeSlug(a.slug)) === slug,
  );

  if (!article) {
    notFound();
  }

  const articleImage = getUploadUrl(article.image);
  const articleTagIds = new Set((article.tags || []).map((tag) => tag.id));
  const hasTags = articleTagIds.size > 0;
  const plainExcerpt = toPlainText(article.excerpt);
  const safeContentHtml = toSafeArticleHtml(article.content);

  const relatedArticles = articles
    .filter((a) => {
      if (a.id === article.id) return false;

      const candidateTagIds = (a.tags || []).map((tag) => tag.id);

      if (hasTags) {
        return candidateTagIds.some((tagId) => articleTagIds.has(tagId));
      }

      return candidateTagIds.length === 0;
    })
    .slice(0, 3);

  return (
    <>
      <article>
        <header className="pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="container article-page-container max-w-6xl">
            <div className="md:flex md:items-start md:gap-8 lg:gap-10">
              <div className="md:flex-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
                  {article.title}
                </h1>

                {plainExcerpt ? (
                  <p className="text-xl md:text-2xl font-semibold text-foreground mb-5">
                    {plainExcerpt}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-foreground-secondary text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{article.publishedAt}</span>
                </div>

                <div className="hidden md:block mt-8">
                  <div
                    className="prose article-content-prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: safeContentHtml }}
                  />

                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-8">
                      {article.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1.5 bg-foreground/5 text-sm rounded-full"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {articleImage && (
                <div className="mt-8 md:mt-0 md:w-[44%] lg:w-[40%] md:shrink-0">
                  <div className="image-frame-shell">
                    <div className="image-frame-inner">
                      <img
                        src={articleImage}
                        alt={article.title}
                        className="image-frame-media"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="py-8 border-t border-b md:hidden">
          <div className="container article-page-container max-w-4xl">
            <div
              className="prose article-content-prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: safeContentHtml }}
            />

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8">
                {article.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1.5 bg-foreground/5 text-sm rounded-full"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {relatedArticles.length > 0 && (
        <section className="py-12 md:py-16 bg-background-secondary">
          <div className="container article-page-container">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              نوشته‌های مرتبط
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <ArticleCard key={related.id} article={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
